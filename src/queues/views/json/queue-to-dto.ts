import type { QueueModel } from '../../../database/models/queue.model'
import { gamemodeConfigs } from '../../../gamemodes/configs'
import { getMapVoteResults } from '../../auto/get-map-vote-results'
import { getSlots } from '../../auto/get-slots'
import { getState } from '../../get-state'
import { queuePageUrl } from '../../queue-page-url'

export async function queueToDto(queue: QueueModel, selfHref = `/api/v1/queues/${queue.slug}`) {
  const [state, slots, mapVoteResults] = await Promise.all([
    getState(queue._id),
    getSlots(queue._id),
    getMapVoteResults(queue._id),
  ])
  const config = gamemodeConfigs[queue.gamemode]

  return {
    slug: queue.slug,
    name: queue.name,
    gamemode: queue.gamemode,
    launchMode: queue.launchMode,
    state,
    config: {
      teamCount: config.teamCount,
      classes: config.classes.map(c => ({
        name: c.name,
        count: c.count,
        ...(c.canMakeFriendsWith ? { canMakeFriendsWith: c.canMakeFriendsWith } : {}),
      })),
    },
    slots: slots.map(slot => ({
      id: slot.id,
      gameClass: slot.gameClass,
      player: slot.player
        ? {
            steamId: slot.player.steamId,
            name: slot.player.name,
            avatarUrl: slot.player.avatarUrl,
          }
        : null,
      ready: slot.ready,
    })),
    mapVoteResults,
    _links: { self: { href: selfHref }, page: { href: queuePageUrl(queue.slug) } },
  }
}
