import { configuration } from '../../configuration'
import { gamemodeConfigs } from '../../gamemodes/configs'
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

  const skill =
    player.skill?.[queue.gamemode]?.[slot.gameClass] ??
    (await configuration.get('games.default_player_skill'))[queue.gamemode]?.[slot.gameClass] ??
    0
  return skill >= queue.skillThreshold
}
