import { configuration } from '../configuration'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { createFromSlots } from './create-from-slots'
import { pickTeams, type PlayerSlot } from './pick-teams'

export async function create(
  queueSlots: QueueSlotModel[],
  map: string,
  friends: SteamId64[][] = [],
) {
  const playerSlots: PlayerSlot[] = await Promise.all(queueSlots.map(queueSlotToPlayerSlot))
  return await createFromSlots(pickTeams(playerSlots, { friends }), map)
}

async function queueSlotToPlayerSlot(queueSlot: QueueSlotModel): Promise<PlayerSlot> {
  if (!queueSlot.player) {
    throw new Error(`queue slot ${queueSlot.id} is empty`)
  }

  const { player, gameClass } = queueSlot
  const defaultPlayerSkill = await configuration.get('games.default_player_skill')
  let skill = defaultPlayerSkill[gameClass]!

  const { skill: playerSkill } = await players.bySteamId(player.steamId, ['skill'])
  if (playerSkill && gameClass in playerSkill) {
    skill = playerSkill[gameClass]!
  }

  return { player: player.steamId, gameClass, skill }
}
