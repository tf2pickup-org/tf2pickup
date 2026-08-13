import type { UpdateFilter } from 'mongodb'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus } from '../database/models/game-slot.model'
import { GameState, type GameModel } from '../database/models/game.model'
import { events } from '../events'
import { logger } from '../logger'
import { parseStatus } from './rcon/parse-status'
import { withRcon } from './rcon/with-rcon'
import { update } from './update'

export async function syncPlayerConnectionStatus(): Promise<void> {
  const runningGames = await collections.games
    .find({ state: { $in: [GameState.launching, GameState.started] } })
    .toArray()

  for (const game of runningGames) {
    if (!game.gameServer) {
      continue
    }

    try {
      await withRcon(game, async ({ rcon }) => {
        const connectedSteamIds = new Set(
          parseStatus(await rcon.send('status')).map(player => player.steamId),
        )

        for (const slot of game.slots) {
          const isOnServer = connectedSteamIds.has(slot.player)

          // Leave players already tracked as joining/connected alone: `status`
          // can't tell whether they joined a team, so promoting them would erase
          // the `joining` distinction the UDP log path provides.
          if (isOnServer && slot.connectionStatus !== PlayerConnectionStatus.offline) {
            continue
          }
          if (!isOnServer && slot.connectionStatus === PlayerConnectionStatus.offline) {
            continue
          }

          const connectionStatus = isOnServer
            ? PlayerConnectionStatus.connected
            : PlayerConnectionStatus.offline

          // Record the departure like the UDP disconnect path does, so the
          // auto-substitute timeout is measured from now and the player keeps
          // their rejoin grace period instead of being subbed instantly.
          const changes: UpdateFilter<GameModel> =
            connectionStatus === PlayerConnectionStatus.offline
              ? {
                  $set: { 'slots.$[element].connectionStatus': connectionStatus },
                  $push: {
                    events: {
                      at: new Date(),
                      event: GameEventType.playerLeftGameServer,
                      player: slot.player,
                    },
                  },
                }
              : { $set: { 'slots.$[element].connectionStatus': connectionStatus } }

          const updatedGame = await update(game.number, changes, {
            arrayFilters: [{ 'element.player': { $eq: slot.player } }],
          })
          events.emit('game:playerConnectionStatusUpdated', {
            game: updatedGame,
            player: slot.player,
            playerConnectionStatus: connectionStatus,
          })
          logger.info(`game #${game.number}: player ${slot.player} synced as ${connectionStatus}`)
        }
      })
    } catch (error) {
      logger.warn(error, `game #${game.number}: failed to sync player connection status`)
    }
  }
}
