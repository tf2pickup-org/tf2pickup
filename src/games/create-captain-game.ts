import { MongoServerError } from 'mongodb'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameState } from '../database/models/game.model'
import { events } from '../events'
import { assertCaptainQueue } from '../queues/captain/assert-captain-queue'
import type { CaptainLaunchSnapshot } from '../queues/captain/types/captain-launch-snapshot'
import { resolveWhitelistId } from '../queues/resolve-whitelist-id'
import { insertGame } from './insert-game'

// The teams and classes are final: no skill reads and no balance search belong here.
export async function createCaptainGame(snapshot: CaptainLaunchSnapshot) {
  const { queue, token, map, slots, captains } = snapshot
  assertCaptainQueue(queue)
  let game = await collections.games.findOne({ captainDraftToken: token })
  if (!game) {
    const execConfig = queue.maps.find(option => option.name === map)?.execConfig
    const whitelistId = await resolveWhitelistId(queue)
    try {
      const { insertedId } = await insertGame({
        gamemode: queue.gamemode,
        queue: queue._id,
        launchMode: 'captain',
        captainDraftToken: token,
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
      game = await collections.games.findOne({ _id: insertedId })
      if (!game) throw new Error('failed creating captain game')
      events.emit('game:created', { game })
    } catch (error) {
      if (!(
        error instanceof MongoServerError &&
        error.code === 11000 &&
        'captainDraftToken' in (error['keyPattern'] ?? {})
      ))
        throw error
      game = await collections.games.findOne({ captainDraftToken: token })
      if (!game) throw error
    }
  }
  // Replayed only to the captain engine, so recovery never replays global game-created effects.
  events.emit('queue/captainGame:created', { game })
  return game
}
