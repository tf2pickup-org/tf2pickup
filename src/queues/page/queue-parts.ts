import { collections } from '../../database/collections'
import type { QueueModel } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { configuration } from '../../configuration'
import { QueueSlot } from '../auto/views/html/queue-slot'
import { CurrentPlayerCount } from '../views/html/current-player-count'
import { TeamPlayerCount } from '../auto/views/html/team-player-count'
import { teamSlots } from '../auto/views/html/team-slots'
import { SetTitle } from '../views/html/set-title'
import { IsInQueue } from '../views/html/is-in-queue'
import { MapVoteSelection } from '../auto/views/html/map-vote-selection'
import { QueueSwitcher } from '../views/html/queue-switcher'
import { MapResult, MapVote } from '../auto/views/html/map-vote'
import { captainQueueParts } from '../captain/captain-queue-parts'
import type { Fragment } from './send-to-pages'

export interface QueueParts {
  slots?: QueueSlotModel[] | 'all' | 'taken'
  // players whose slots show a changed friendship
  friends?: SteamId64[]
  counts?: boolean
  // whether the viewer is in this queue, and what they voted for
  membership?: boolean
  mapVote?: boolean
  mapResults?: Record<string, number>
  // captain queues: the sign-up pool and its counters
  captainPool?: boolean
  // captain queues: the draft's frame, and the draft's parts
  captainStage?: boolean
  captainDraft?: boolean
}

// What belongs to one queue on its page; the rest of the page is shared by every queue.
export async function queueParts(queue: QueueModel, parts: QueueParts): Promise<Fragment[]> {
  if (queue.launchMode === 'captain') {
    return captainQueueParts(queue, parts)
  }

  const fragments: Fragment[] = []

  const slots = await pickSlots(queue, parts)
  if (slots.length > 0) {
    const defaultSkill = (await configuration.get('games.default_player_skill'))[queue.gamemode]
    fragments.push(
      ...slots.map(
        (slot): Fragment =>
          async ({ actor }) =>
            QueueSlot({ queue, slot, actor: await actor(), defaultSkill }),
      ),
    )
  }

  if (parts.counts) {
    const all = await collections.queueSlots.find({ queue: queue._id }).toArray()
    const counts = [
      ...teamSlots(queue.gamemode, all).map((team, teamIndex) =>
        TeamPlayerCount({ teamIndex, slots: team }),
      ),
      CurrentPlayerCount({ queue: queue._id }),
      SetTitle({ queue }),
    ]
    fragments.push(
      ...counts.map(
        (html): Fragment =>
          () =>
            html,
      ),
    )
  }

  if (parts.membership) {
    fragments.push(
      ({ steamId }) => IsInQueue({ queue: queue._id, actor: steamId }),
      ({ steamId }) => MapVoteSelection({ queue: queue._id, actor: steamId }),
      ({ steamId }) => QueueSwitcher({ active: queue, actor: steamId }),
    )
  }

  if (parts.mapVote) {
    fragments.push(({ steamId }) => MapVote({ queue: queue._id, actor: steamId }))
  }

  const { mapResults } = parts
  if (mapResults) {
    const options = await collections.queueMapOptions.find({ queue: queue._id }).toArray()
    fragments.push(
      ...options.map(
        (option): Fragment =>
          () =>
            MapResult({ results: mapResults, map: option.name }),
      ),
    )
  }

  return fragments
}

async function pickSlots(queue: QueueModel, parts: QueueParts): Promise<QueueSlotModel[]> {
  const picked: QueueSlotModel[] = []
  if (Array.isArray(parts.slots)) {
    picked.push(...parts.slots)
  } else if (parts.slots) {
    picked.push(
      ...(await collections.queueSlots
        .find({ queue: queue._id, ...(parts.slots === 'taken' ? { player: { $ne: null } } : {}) })
        .toArray()),
    )
  }

  if (parts.friends?.length) {
    picked.push(
      ...(await collections.queueSlots
        .find({ queue: queue._id, 'player.steamId': { $in: parts.friends } })
        .toArray()),
    )
  }
  return picked
}
