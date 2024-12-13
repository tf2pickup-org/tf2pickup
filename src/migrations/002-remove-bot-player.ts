// Remove the bot player that was previously used to indicate automatic actions - subbed-out players, closed games, etc.

import { collections } from '../database/collections'
import type { PlayerRole } from '../database/models/player.model'

export async function up() {
  await collections.players.deleteOne({ roles: 'bot' as PlayerRole })
}
