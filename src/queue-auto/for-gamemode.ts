import { collections } from '../database/collections'
import type { QueueState } from '../database/models/queue-state.model'
import { resetMapOptions } from '../maps/reset-options'
import { getState } from '../queue/get-state'
import { setState } from '../queue/set-state'
import type { QueueSlotId } from '../queue/types/queue-slot-id'
import { withQueueLock } from '../queue/with-queue-lock'
import type { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getFriends } from './get-friends'
import { getMapVoteResults } from './get-map-vote-results'
import { getMapWinner } from './get-map-winner'
import { getSlots } from './get-slots'
import { join } from './join'
import { reset } from './reset'
import { unreadyQueue } from './unready-queue'

export function forGamemode(gamemode: Gamemode) {
  return Object.freeze({
    gamemode,

    state: () => getState(gamemode),
    slots: () => getSlots(gamemode),
    mapVoteResults: () => getMapVoteResults(gamemode),
    mapWinner: () => getMapWinner(gamemode),
    friends: () => getFriends(gamemode),
    playerCount: () => collections.queueSlots.countDocuments({ gamemode, player: { $ne: null } }),
    readyCount: () => collections.queueSlots.countDocuments({ gamemode, ready: { $eq: true } }),
    size: () => collections.queueSlots.countDocuments({ gamemode }),

    reset: () => reset(gamemode),
    unready: () => unreadyQueue(gamemode),
    setState: (state: QueueState) => setState(gamemode, state),
    join: (slotId: QueueSlotId, steamId: SteamId64) => join(gamemode, slotId, steamId),
    withLock: <T>(label: string, fn: () => Promise<T>) => withQueueLock(gamemode, label, fn),
    resetMapOptions: () => resetMapOptions(gamemode),
  })
}
