import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus } from '../database/models/game-slot.model'
import type { GameNumber } from '../database/models/game.model'
import { logger } from '../logger'
import { findOne } from './find-one'
import { parseStatus } from './rcon/parse-status'
import { withRcon } from './rcon/with-rcon'
import { gameLifecycle } from './lifecycle'
import { secondsToMilliseconds } from 'date-fns'
import { asyncThrottle } from '../utils/async-throttle'
import { memoize } from 'es-toolkit'

const syncPlayerConnectionStatusFn = memoize((gameNumber: GameNumber) =>
  asyncThrottle(async () => {
    await syncPlayerConnectionStatusImpl(gameNumber)
  }, secondsToMilliseconds(30)),
)

export const syncPlayerConnectionStatus = async (gameNumber: GameNumber) =>
  await syncPlayerConnectionStatusFn(gameNumber)()

async function syncPlayerConnectionStatusImpl(gameNumber: GameNumber): Promise<void> {
  const game = await findOne({ number: gameNumber }, ['slots', 'number', 'gameServer'])
  try {
    await withRcon(game, async ({ rcon }) => {
      const statusOutput = await rcon.send('status')
      const connectedPlayers = parseStatus(statusOutput)
      const connectedSteamIds = new Set(connectedPlayers.map(p => p.steamId))

      for (const slot of game.slots) {
        const isOnServer = connectedSteamIds.has(slot.player)

        if (isOnServer && slot.connectionStatus !== PlayerConnectionStatus.connected) {
          // Player is on server but status is not connected - mark as connected
          await gameLifecycle.setConnection(
            game.number,
            slot.player,
            PlayerConnectionStatus.connected,
          )
          logger.info(`game #${game.number}: player ${slot.player} synced as connected`)
        } else if (!isOnServer && slot.connectionStatus !== PlayerConnectionStatus.offline) {
          // Player is not on server but status is not offline - mark as offline
          await gameLifecycle.setConnection(
            game.number,
            slot.player,
            PlayerConnectionStatus.offline,
            {
              at: new Date(),
              event: GameEventType.playerLeftGameServer,
              player: slot.player,
            },
          )
          logger.info(`game #${game.number}: player ${slot.player} synced as offline`)
        }
      }
    })
  } catch (error) {
    logger.warn(error, `game #${game.number}: failed to sync players' connection statuses`)
  }
}
