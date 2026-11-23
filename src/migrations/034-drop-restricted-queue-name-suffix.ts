import { collections } from '../database/collections'

// Restricted queues are marked with an emoji now, so the presets' "(restricted)" suffix goes.
export async function up() {
  await collections.queues.updateMany(
    { requireVerification: true, name: { $regex: / \(restricted\)$/ } },
    [
      {
        $set: { name: { $replaceOne: { input: '$name', find: ' (restricted)', replacement: '' } } },
      },
    ],
  )
}
