import { collections } from '../database/collections'

// The restricted presets are marked with an emoji now instead of a "(restricted)" suffix.
export async function up() {
  for (const gamemode of ['6v6', '9v9']) {
    await collections.queues.updateMany(
      { name: `${gamemode} (restricted)` },
      { $set: { name: `🔒 ${gamemode}` } },
    )
  }
}
