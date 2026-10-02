import { collections } from '../database/collections'
import { environment } from '../environment'

// The default player skill used to be a single class→skill map, because an instance ran exactly
// one gamemode.
export async function up() {
  const entry = await collections.configuration.findOne({ key: 'games.default_player_skill' })
  if (!entry) {
    return
  }

  await collections.configuration.updateOne(
    { key: 'games.default_player_skill' },
    { $set: { value: { [environment.QUEUE_CONFIG]: entry.value } } },
  )
}
