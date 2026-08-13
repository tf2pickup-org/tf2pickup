import { collections } from '../database/collections'
import { PlayerConnectionStatus } from '../database/models/game-slot.model'
import { GameState } from '../database/models/game.model'
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
          const connectionStatus = connectedSteamIds.has(slot.player)
            ? PlayerConnectionStatus.connected
            : PlayerConnectionStatus.offline

          if (slot.connectionStatus === connectionStatus) {
            continue
          }

          const updatedGame = await update(
            game.number,
            { $set: { 'slots.$[element].connectionStatus': connectionStatus } },
            { arrayFilters: [{ 'element.player': { $eq: slot.player } }] },
          )
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
