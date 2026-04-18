import { Mutex } from 'async-mutex'
import { secondsToMilliseconds } from 'date-fns'
import { retry } from 'es-toolkit'
import { GameEventType } from '../database/models/game-event.model'
import type { GameNumber } from '../database/models/game.model'
import { notifyGameServerAssignmentFailed } from '../discord/notify-game-server-assignment-failed'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { servemeTf } from '../serveme-tf'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { staticGameServers } from '../static-game-servers'
import { tf2QuickServer } from '../tf2-quick-server'
import type { GameServerSelection } from './schemas/game-server-selection'
import { update } from './update'
import { collections } from '../database/collections'
import type { GameModel, GameServer } from '../database/models/game.model'

export interface AssignGameServerOptions {
  selected?: GameServerSelection
  actor?: SteamId64
  retries?: number
}

const mutex = new Mutex()

export async function assignGameServer(
  gameNumber: GameNumber,
  options: AssignGameServerOptions = {},
): Promise<void> {
  const { selected, actor, retries = 1 } = options
  try {
    await retry(() => doAssign(gameNumber, selected, actor), {
      retries,
      delay: secondsToMilliseconds(1),
    })
  } catch (error) {
    logger.error({ error }, `failed to assign game server for game #${gameNumber}`)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const reason = errorMessage.includes('no free servers available')
      ? 'no game servers available'
      : 'cannot assign game server'
    try {
      await update(gameNumber, {
        $push: {
          events: {
            event: GameEventType.gameServerAssignmentFailed,
            at: new Date(),
            reason,
          },
        },
      })
      await notifyGameServerAssignmentFailed(gameNumber, reason)
    } catch (innerError) {
      logger.error(
        { error: innerError },
        `failed to record assignment failure for game #${gameNumber}`,
      )
    }
    throw error
  }
}

async function doAssign(
  gameNumber: GameNumber,
  selected?: GameServerSelection,
  actor?: SteamId64,
): Promise<void> {
  const game = await collections.games.findOne({ number: gameNumber })
  if (!game) throw errors.notFound(`Game #${gameNumber} not found`)
  await mutex.runExclusive(async () => {
    const gameServer = selected ? await assignSelected(game, selected) : await assignFirstFree(game)

    const updated = await update(gameNumber, {
      $set: { gameServer },
      $push: {
        events: {
          event: GameEventType.gameServerAssigned,
          at: new Date(),
          gameServerName: gameServer.name,
          ...(actor && { actor }),
        },
      },
    })

    logger.info({ game: updated }, `game ${gameNumber} assigned to game server ${gameServer.name}`)
    events.emit('game:gameServerAssigned', { game: updated })
  })
}

async function assignFirstFree(game: GameModel): Promise<GameServer> {
  try {
    return await staticGameServers.assign(game)
  } catch {
    // static unavailable, try next
  }
  try {
    return await servemeTf.assign(game)
  } catch {
    // serveme.tf unavailable, try next
  }
  try {
    return await tf2QuickServer.assign({ map: game.map })
  } catch (error) {
    logger.error(error)
    throw errors.internalServerError(`no free servers available for game ${game.number}`)
  }
}

async function assignSelected(game: GameModel, selected: GameServerSelection): Promise<GameServer> {
  switch (selected.provider) {
    case 'static':
      return staticGameServers.assign(game, selected.id)
    case 'servemeTf':
      return servemeTf.assign(game, selected.name)
    case 'tf2QuickServer':
      if (selected.server.select === 'new') {
        return tf2QuickServer.assign({ region: selected.server.region, map: game.map })
      }
      return tf2QuickServer.assign({ serverId: selected.server.serverId, map: game.map })
  }
}
