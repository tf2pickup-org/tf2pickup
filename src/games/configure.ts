import { secondsToMilliseconds } from 'date-fns'
import { deburr } from 'lodash-es'
import { Rcon } from 'rcon-client'
import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { SlotStatus } from '../database/models/game-slot.model'
import { type GameModel, GameServerProvider, GameState } from '../database/models/game.model'
import { environment } from '../environment'
import { logger } from '../logger'
import { LogsTfUploadMethod } from '../shared/types/logs-tf-upload-method'
import { assertIsError } from '../utils/assert-is-error'
import { generateGameserverPassword } from '../utils/generate-game-server-password'
import { makeConnectString } from './make-connect-string'
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
} from './rcon-commands'
import { update } from './update'
import { extractConVarValue } from './extract-con-var-value'

export async function configure(game: GameModel) {
  if (game.gameServer === undefined) {
    throw new Error(`gameServer is undefined`)
  }
  if (game.gameServer.provider !== GameServerProvider.static) {
    throw new Error(`gameServer provider not supported`)
  }

  logger.info({ game }, `configuring game ${game.number}...`)

  const password = generateGameserverPassword()
  const configLines = await compileConfig(game, password)
  const gameServer = await collections.staticGameServers.findOne({ id: game.gameServer.id })
  if (gameServer === null) {
    throw new Error(`gameServer not found`)
  }
  let rcon: Rcon | undefined = undefined
  try {
    rcon = await Rcon.connect({
      host: gameServer.internalIpAddress,
      port: Number(gameServer.port),
      password: gameServer.rconPassword,
    })
    rcon.on('error', error => {
      assertIsError(error)
      logger.error(error, `game #${game.number}: rcon error`)
    })

    game = await update(game.number, {
      $set: {
        state: GameState.configuring,
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
        await waitABit(secondsToMilliseconds(10))
      }

      if (!rcon.authenticated) {
        await rcon.connect()
      }
    }

    logger.info(game, `game ${game.number} configured`)

    const connectString = makeConnectString({
      address: gameServer.address,
      port: gameServer.port,
      password,
    })
    logger.info(game, `connect string: ${connectString}`)

    const stvConnectString = makeConnectString({
      address: gameServer.address,
      port: extractConVarValue(await rcon.send(tvPort())) ?? 27020,
      password: extractConVarValue(await rcon.send(tvPassword())),
    })
    logger.info(game, `stv connect string: ${stvConnectString}`)

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

    return {
      connectString,
    }
  } catch (error) {
    assertIsError(error)
    logger.error(error, `error configuring game #${game.number}`)
    throw error
  } finally {
    await rcon?.end()
  }
}

async function compileConfig(game: GameModel, password: string): Promise<string[]> {
  return [
    logAddressAdd(`${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`),
    kickAll(),
    changelevel(game.map),
  ]
    .concat(
      await (async () => {
        const map = await collections.maps.findOne({ name: game.map })
        if (map !== null) {
          return map.execConfig ?? []
        } else {
          return []
        }
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
        game.slots
          .filter(slot => slot.status !== SlotStatus.replaced)
          .map(async slot => {
            const player = await collections.players.findOne({ _id: slot.player })
            if (player === null) {
              throw new Error(`player ${slot.player.toString()} not found`)
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

const waitABit = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
