import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'
import { PlayerConnectionStatus } from '../../database/models/game-slot.model'
import { logger } from '../../logger'
import { withRcon } from '../rcon/with-rcon'
import { parseStatus } from '../rcon/parse-status'
import { events } from '../../events'
import { update } from '../update'

export default fp(
  async () => {
    // Find all running games
    const runningGames = await collections.games
      .find({ state: { $in: [GameState.launching, GameState.started] } })
      .toArray()

    for (const game of runningGames) {
      if (!game.gameServer) continue

      try {
        await withRcon(game, async ({ rcon }) => {
          const statusOutput = await rcon.send('status')
          const connectedPlayers = parseStatus(statusOutput)
          const connectedSteamIds = new Set(connectedPlayers.map(p => p.steamId))

          for (const slot of game.slots) {
            const isOnServer = connectedSteamIds.has(slot.player)

            if (isOnServer && slot.connectionStatus !== PlayerConnectionStatus.connected) {
              // Player is on server but status is not connected - mark as connected
              const updatedGame = await update(
                game.number,
                {
                  $set: {
                    'slots.$[element].connectionStatus': PlayerConnectionStatus.connected,
                  },
                },
                {
                  arrayFilters: [{ 'element.player': { $eq: slot.player } }],
                },
              )
              events.emit('game:playerConnectionStatusUpdated', {
                game: updatedGame,
                player: slot.player,
                playerConnectionStatus: PlayerConnectionStatus.connected,
              })
              logger.info(`game #${game.number}: player ${slot.player} synced as connected`)
            } else if (!isOnServer && slot.connectionStatus !== PlayerConnectionStatus.offline) {
              // Player is not on server but status is not offline - mark as offline
              const updatedGame = await update(
                game.number,
                {
                  $set: {
                    'slots.$[element].connectionStatus': PlayerConnectionStatus.offline,
                  },
                },
                {
                  arrayFilters: [{ 'element.player': { $eq: slot.player } }],
                },
              )
              events.emit('game:playerConnectionStatusUpdated', {
                game: updatedGame,
                player: slot.player,
                playerConnectionStatus: PlayerConnectionStatus.offline,
              })
              logger.info(`game #${game.number}: player ${slot.player} synced as offline`)
            }
          }
        })
      } catch (error) {
        logger.warn(error, `game #${game.number}: failed to sync player connection status`)
      }
    }
  },
  { name: 'sync player connection status' },
)
