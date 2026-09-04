import { getState } from '../../../queue/get-state'
import { getSlots } from '../../get-slots'
import { getMapVoteResults } from '../../get-map-vote-results'
import { getQueueConfig } from '../../configs'
import type { Gamemode } from '../../../shared/types/gamemode'

export async function queueToDto(gamemode: Gamemode, selfHref: string) {
  const [state, slots, mapVoteResults] = await Promise.all([
    getState(gamemode),
    getSlots(gamemode),
    getMapVoteResults(gamemode),
  ])

  const config = getQueueConfig(gamemode)

  return {
    gamemode,
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
    _links: { self: { href: selfHref } },
  }
}
