import { collections } from '../database/collections'
import type { SlotStatus } from '../database/models/game-slot.model'

export async function up() {
  await collections.games.updateMany(
    {},
    {
      $pull: {
        slots: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment
          status: 'replaced' as SlotStatus,
        },
      },
    },
  )
}
