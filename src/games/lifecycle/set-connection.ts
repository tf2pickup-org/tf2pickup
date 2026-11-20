import type { PlayerConnectionStatus } from '../../database/models/game-slot.model'
import type { GameNumber } from '../../database/models/game.model'
import type {
  PlayerJoinedGameServer,
  PlayerJoinedGameServerTeam,
  PlayerLeftGameServer,
} from '../../database/models/game-event.model'
import { events } from '../../events'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { mutex } from '../mutex'
import { applyTransition } from './apply-transition'
import { runningGameStates } from './running-game-states'

export async function setConnection(
  number: GameNumber,
  player: SteamId64,
  status: PlayerConnectionStatus,
  event?: PlayerJoinedGameServer | PlayerJoinedGameServerTeam | PlayerLeftGameServer,
) {
  const game = await mutex.runExclusive(
    async () =>
      await applyTransition(
        'setConnection',
        number,
        runningGameStates,
        {
          $set: { 'slots.$[slot].connectionStatus': status },
          ...(event && { $push: { events: event } }),
        },
        { arrayFilters: [{ 'slot.player': { $eq: player } }] },
      ),
  )
  if (game) {
    events.emit('game:playerConnectionStatusUpdated', {
      game,
      player,
      playerConnectionStatus: status,
    })
  }
  return game
}
