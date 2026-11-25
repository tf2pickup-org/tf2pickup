import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameState } from '../database/models/game.model'
import { events } from '../events'
import { assertCaptainQueue } from '../queues/captain/assert-captain-queue'
import type { LaunchSnapshot } from '../queues/types/launch-snapshot'
import { resolveWhitelistId } from '../queues/resolve-whitelist-id'
import { insertGame } from './insert-game'

// The teams and classes are final: no skill reads and no balance search belong here.
export async function createCaptainGame(snapshot: Extract<LaunchSnapshot, { captains: unknown }>) {
  const { queue, token, map, slots, captains } = snapshot
  assertCaptainQueue(queue)
  const execConfig = queue.maps.find(option => option.name === map)?.execConfig
  const whitelistId = await resolveWhitelistId(queue)
  const { game, inserted } = await insertGame({
    gamemode: queue.gamemode,
    queue: queue._id,
    launchMode: 'captain',
    launchToken: token,
    captains,
    map,
    ...(execConfig ? { execConfig } : {}),
    ...(whitelistId ? { whitelistId } : {}),
    state: GameState.created,
    slots: slots.map(({ id, player, team, gameClass }) => ({
      id,
      player,
      team,
      gameClass,
      status: SlotStatus.active,
      connectionStatus: PlayerConnectionStatus.offline,
    })),
    events: [{ at: new Date(), event: GameEventType.gameCreated }],
  })
  if (inserted) events.emit('game:created', { game })
  events.emit('queue/game:created', { game })
  return { game, inserted }
}
