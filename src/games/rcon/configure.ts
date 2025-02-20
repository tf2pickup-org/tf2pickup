import { secondsToMilliseconds } from 'date-fns'
import { deburr, delay } from 'es-toolkit'
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import { GameEventType } from '../../database/models/game-event.model'
import { type GameModel, GameServerProvider, GameState } from '../../database/models/game.model'
import { environment } from '../../environment'
import { logger } from '../../logger'
import { LogsTfUploadMethod } from '../../shared/types/logs-tf-upload-method'
import { generateGameserverPassword } from '../../utils/generate-game-server-password'
import { makeConnectString } from '../make-connect-string'
import {
  logAddressAdd,
  kickAll,
  changelevel,
  tftrueWhitelistId,
  setPassword,
  addGamePlayer,
  enablePlayerWhitelist,
  logsTfTitle,
  logsTfAutoupload,
  tvPort,
  tvPassword,
  svLogsecret,
  execConfig,
} from './commands'
import { update } from '../update'
import { extractConVarValue } from '../extract-con-var-value'
import { generate } from 'generate-password'
import { events } from '../../events'
import { withRcon } from './with-rcon'
import { servemeTf } from '../../serveme-tf'
import type { ReservationId } from '@tf2pickup-org/serveme-tf-client'

export async function configure(game: GameModel, options: { signal?: AbortSignal } = {}) {
  if (game.gameServer === undefined) {
    throw new Error(`gameServer is undefined`)
  }
  logger.info({ game }, `configuring game #${game.number}...`)
  const { signal } = options

  if (game.gameServer.provider === GameServerProvider.servemeTf) {
    await servemeTf.waitForStart(Number(game.gameServer.id) as ReservationId)
  }

  if (signal?.aborted) {
    throw new Error(`${signal.reason}`)
  }

  const password = generateGameserverPassword()
  const configLines = await compileConfig(game, password)

  return await withRcon(game, async ({ rcon }) => {
    let logSecret: string
    if (!game.gameServer!.logSecret) {
      logSecret = generate({
        length: 16,
        numbers: true,
        symbols: false,
        lowercase: false,
        uppercase: false,
      })
      await rcon.send(svLogsecret(logSecret))
    } else {
      logSecret = game.gameServer!.logSecret
    }

    if (signal?.aborted) {
      throw new Error(`${signal.reason}`)
    }

    game = await update(game.number, {
      $set: {
        state: GameState.configuring,
        logSecret,
      },
      $unset: {
        connectString: 1,
        stvConnectString: 1,
      },
    })

    for (const line of configLines) {
      logger.debug(line)
      await rcon.send(line)
      if (line.startsWith('changelevel')) {
        await delay(secondsToMilliseconds(10))
      }

      if (!rcon.authenticated) {
        await rcon.connect()
      }
    }

    logger.info(game, `game ${game.number} configured`)

    const connectString = makeConnectString({
      ...game.gameServer!,
      password,
    })
    logger.info(game, `connect string: ${connectString}`)

    const stvConnectString = makeConnectString({
      address: game.gameServer!.address,
      port: extractConVarValue(await rcon.send(tvPort())) ?? 27020,
      password: extractConVarValue(await rcon.send(tvPassword())),
    })
    logger.info(game, `stv connect string: ${stvConnectString}`)

    if (signal?.aborted) {
      throw new Error(`${signal.reason}`)
    }

    game = await update(game.number, {
      $set: {
        connectString,
        stvConnectString,
        state: GameState.launching,
      },
      $push: {
        events: {
          event: GameEventType.gameServerInitialized,
          at: new Date(),
        },
      },
    })
    events.emit('game:gameServerInitialized', { game })

    return {
      connectString,
    }
  })
}

async function compileConfig(game: GameModel, password: string): Promise<string[]> {
  return [
    logAddressAdd(`${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`),
    kickAll(),
  ]
    .concat(game.gameServer?.provider === GameServerProvider.static ? changelevel(game.map) : [])
    .concat(
      await (async () => {
        const map = await collections.maps.findOne({ name: game.map })
        return map?.execConfig ? execConfig(map.execConfig) : []
      })(),
    )
    .concat(
      await (async () => {
        const whitelistId = await configuration.get('games.whitelist_id')
        if (whitelistId !== null) {
          return tftrueWhitelistId(whitelistId)
        } else {
          return []
        }
      })(),
    )
    .concat(setPassword(password))
    .concat(
      await Promise.all(
        game.slots.map(async slot => {
          const player = await collections.players.findOne({ steamId: slot.player })
          if (player === null) {
            throw new Error(`player ${slot.player} not found`)
          }
          return addGamePlayer(player.steamId, deburr(player.name), slot.team, slot.gameClass)
        }),
      ),
    )
    .concat(enablePlayerWhitelist())
    .concat(logsTfTitle(`${environment.WEBSITE_NAME} #${game.number}`))
    .concat(
      (await configuration.get('games.logs_tf_upload_method')) === LogsTfUploadMethod.gameserver
        ? logsTfAutoupload(2)
        : logsTfAutoupload(0),
    )
    .concat(await configuration.get('games.execute_extra_commands'))
    .filter(Boolean)
}
