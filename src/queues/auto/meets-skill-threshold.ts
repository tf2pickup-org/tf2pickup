import { configuration } from '../../configuration'
import { gamemodeConfigs } from '../../gamemodes/configs'
import { effectiveSkill } from '../../players/effective-skill'
import type { PlayerModel } from '../../database/models/player.model'
import type { QueueModel } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'

export async function meetsSkillThreshold(
  player: Pick<PlayerModel, 'skill'>,
  slot: Pick<QueueSlotModel, 'gameClass'>,
  queue: Pick<QueueModel, 'skillThreshold' | 'gamemode'>,
): Promise<boolean> {
  if (queue.skillThreshold === null || !gamemodeConfigs[queue.gamemode].autoBalance) {
    return true
  }

  const skill = effectiveSkill(
    player.skill?.[queue.gamemode],
    (await configuration.get('games.default_player_skill'))[queue.gamemode],
    slot.gameClass,
  )
  return skill >= queue.skillThreshold
}
