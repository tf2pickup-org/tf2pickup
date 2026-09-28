import { configuration } from '../../configuration'
import type { PlayerModel } from '../../database/models/player.model'
import type { QueueModel } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { gamemodeConfigs } from '../../gamemodes/configs'
import { effectiveSkill } from '../../players/effective-skill'
import { hasActiveBan } from '../../players/has-active-ban'

export type JoinBlockerPlayer = Pick<
  PlayerModel,
  'hasAcceptedRules' | 'bans' | 'activeGame' | 'verified' | 'skill'
>

export async function joinBlocker(
  player: JoinBlockerPlayer,
  slot: Pick<QueueSlotModel, 'gameClass'>,
  queue: Pick<QueueModel, 'enabled' | 'requireVerification' | 'skillThreshold' | 'gamemode'>,
): Promise<string | null> {
  if (!queue.enabled) {
    return 'This queue is disabled'
  }

  if (!player.hasAcceptedRules) {
    return 'You have not accepted the rules'
  }

  if (hasActiveBan(player)) {
    return 'You have active bans'
  }

  if (player.activeGame) {
    return 'You are already in a game'
  }

  if (queue.requireVerification && !player.verified) {
    return 'You are not verified to join the queue'
  }

  if (queue.skillThreshold !== null && gamemodeConfigs[queue.gamemode].autoBalance) {
    const skill = effectiveSkill(
      player.skill?.[queue.gamemode],
      (await configuration.get('games.default_player_skill'))[queue.gamemode],
      slot.gameClass,
    )
    if (skill < queue.skillThreshold) {
      return `You do not meet skill requirements to play ${slot.gameClass}`
    }
  }

  return null
}
