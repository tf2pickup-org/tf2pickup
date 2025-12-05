import { configuration } from '../configuration'
import type { PlayerModel } from '../database/models/player.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'

export async function meetsSkillThreshold(
  player: Pick<PlayerModel, 'skill'>,
  slot: Pick<QueueSlotModel, 'gameClass'>,
): Promise<boolean> {
  const skillThreshold = await configuration.get('queue.player_skill_threshold')
  if (skillThreshold === null) {
    return true
  }

  const skill =
    player.skill?.[slot.gameClass] ??
    (await configuration.get('games.default_player_skill'))[slot.gameClass] ??
    0
  return skill >= skillThreshold
}
