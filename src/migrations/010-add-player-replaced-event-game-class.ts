import { collections } from '../database/collections'
import {
  GameEventType,
  type PlayerReplaced,
  type SubstituteRequested,
} from '../database/models/game-event.model'
import { logger } from '../logger'

export async function up() {
  const games = await collections.games.find().toArray()
  let updatedGames = 0
  for (const game of games) {
    let updatedEvents = 0
    for (const playerReplaced of game.events.filter(
      ({ event }) => event === GameEventType.playerReplaced,
    ) as PlayerReplaced[]) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (playerReplaced.gameClass) {
        continue
      }

      const substituteRequested = game.events
        .toSorted((a, b) => b.at.getTime() - a.at.getTime())
        .find(e => e.event === GameEventType.substituteRequested && e.at <= playerReplaced.at)
      if (!substituteRequested) {
        throw new Error(`substitute requested event not found (game #${game.number})`)
      }

      await collections.games.updateOne(
        { _id: game._id, 'events.at': playerReplaced.at, 'events.event': playerReplaced.event },
        { $set: { 'events.$.gameClass': (substituteRequested as SubstituteRequested).gameClass } },
      )

      updatedEvents += 1
    }

    if (updatedEvents >= 0) {
      updatedGames += 1
    }
  }

  logger.info(`updated ${updatedGames} games`)
}
