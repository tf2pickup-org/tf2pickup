import { collections } from '../database/collections'
import { isBot } from '../shared/types/bot'

// Cooldown levels now decay one level per period, which needs a starting point. Players who
// reached a level before this change have no recorded timestamp, so the most recent cooldown ban is
// used; those are always issued by the bot, unlike the mirrored ETF2L ones. Otherwise the moment
// they joined.
export async function up() {
  const players = await collections.players
    .find(
      { cooldownLevel: { $gt: 0 }, cooldownLevelUpdatedAt: { $exists: false } },
      { projection: { joinedAt: 1, bans: 1 } },
    )
    .toArray()

  if (players.length === 0) return

  await collections.players.bulkWrite(
    players.map(player => ({
      updateOne: {
        filter: { _id: player._id },
        update: {
          $set: {
            cooldownLevelUpdatedAt: (player.bans ?? [])
              .filter(ban => isBot(ban.actor) && ban.source !== 'etf2l')
              .reduce((latest, ban) => (ban.start > latest ? ban.start : latest), player.joinedAt),
          },
        },
      },
    })),
  )
}
