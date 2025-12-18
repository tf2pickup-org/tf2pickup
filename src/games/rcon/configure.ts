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
import { update } from '../update'
import { extractConVarValue } from '../extract-con-var-value'
import { generate } from 'generate-password'
import { events } from '../../events'
import { withRcon } from './with-rcon'
import { servemeTf } from '../../serveme-tf'
import type { ReservationId } from '@tf2pickup-org/serveme-tf-client'
import { errors } from '../../errors'
import { players } from '../../players'
import type { RconCommand } from '../../shared/types/rcon-command'

export async function configure(game: GameModel, options: { signal?: AbortSignal } = {}) {
  if (game.gameServer === undefined) {
    throw errors.badRequest('gameServer is undefined')
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
      await rcon.send(`sv_logsecret ${logSecret}`)
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

    for await (const line of compileConfig(game, password)) {
      logger.debug(line)
      await rcon.send(line)
      if (line.startsWith('changelevel')) {
        await delay(secondsToMilliseconds(10))
      }
    }

    logger.info(game, `game ${game.number} configured`)

    const connectString = await makeConnectString({
      ...game.gameServer!,
      password,
    })
    logger.info(game, `connect string: ${connectString}`)

    const stvConnectString = await makeConnectString({
      address: game.gameServer!.address,
      port: extractConVarValue(await rcon.send(`tv_port`)) ?? 27020,
      password: extractConVarValue(await rcon.send(`tv_password`)),
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

async function* compileConfig(game: GameModel, password: string): AsyncGenerator<RconCommand> {
  yield `logaddress_add ${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`
  yield 'kickall'

  if (game.gameServer?.provider !== GameServerProvider.servemeTf) {
    // serveme.tf servers are already started with the proper map
    yield `changelevel ${game.map}`
  }

  const map = await collections.maps.findOne({ name: game.map })
  if (map?.execConfig) {
    yield `exec ${map.execConfig}`
  }

  const whitelistId = await configuration.get('games.whitelist_id')
  if (whitelistId !== null) {
    yield `tftrue_whitelist_id ${whitelistId}`
  }

  yield `sv_password ${password}`

  for (const slot of game.slots) {
    const player = await players.bySteamId(slot.player, ['name'])
    yield `sm_game_player_add ${slot.player} -name "${deburr(player.name)}" -team ${slot.team} -class ${slot.gameClass}`
  }

  yield 'sm_game_player_whitelist 1'
  yield `logstf_title ${environment.WEBSITE_NAME} #${game.number}`

  const logsTfUploadMethod = await configuration.get('games.logs_tf_upload_method')
  if (logsTfUploadMethod === LogsTfUploadMethod.gameserver) {
    yield `logstf_autoupload 2`
  } else {
    yield `logstf_autoupload 0`
  }

  const extraCommands = await configuration.get('games.execute_extra_commands')
  for (const command of extraCommands) {
    yield command as RconCommand
  }
}
