import { collections } from '../database/collections'
import { logger } from '../logger'
import { formatBody } from '../chat/format-body'

export async function up() {
  const cursor = collections.chatMessages.find({ originalBody: { $exists: false } })

  let updated = 0

  while (await cursor.hasNext()) {
    const message = await cursor.next()
    if (!message) {
      continue
    }

    const originalBody = message.body
    const formattedBody = formatBody(originalBody)

    await collections.chatMessages.updateOne(
      { _id: message._id },
      {
        $set: {
          originalBody,
          body: formattedBody,
        },
      },
    )

    updated += 1
  }

  logger.info(`formatted ${updated} chat messages with linkified content`)
}
