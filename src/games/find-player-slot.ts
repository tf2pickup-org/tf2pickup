import { collections } from '../database/collections'
import { SlotStatus } from '../database/models/game-slot.model'
import type { GameModel } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function findPlayerSlot(game: GameModel, player: SteamId64) {
  for (const slot of game.slots.filter(s => s.status !== SlotStatus.replaced)) {
    const ps = await collections.players.findOne({ steamId: slot.player })
    if (!ps) {
      throw new Error(`player in slot does not exist: ${slot.player.toString()}`)
    }

    if (ps.steamId === player) {
      return slot
    }
  }

  return null
}
