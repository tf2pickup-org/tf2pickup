import fp from 'fastify-plugin'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { update } from '../update'
import { GameEventType } from '../../database/models/game-event.model'
import { findOne } from '../find-one'
import { isStopwatchRound } from '../is-stopwatch-round'
import { collections } from '../../database/collections'

// TF2 reports a round's outcome across several log lines that may arrive in any
// order — Round_Win, Round_Length and the per-team score. We accumulate them in
// the games.roundprogress collection (instead of in memory) so that a partially
// observed round, and the pending side-swap on stopwatch maps, survive an app
// restart. A round is committed as a `roundEnded` game event once complete.
export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    // Atomically claim a complete round: clear it from the progress document and
    // return its pre-clear snapshot. Only the caller that observes the round as
    // complete gets a non-null result, so the round is committed exactly once
    // even if several log lines complete it near-simultaneously.
    async function maybeRoundEnded(gameNumber: GameNumber) {
      const claimed = await collections.gamesRoundProgress.findOneAndUpdate(
        {
          gameNumber,
          'round.winner': { $exists: true },
          'round.lengthMs': { $exists: true },
          'round.score.red': { $exists: true },
          'round.score.blu': { $exists: true },
        },
        { $unset: { round: '' } },
        { returnDocument: 'before' },
      )

      const round = claimed?.round
      if (
        round?.winner === undefined ||
        round.lengthMs === undefined ||
        round.score?.blu === undefined ||
        round.score.red === undefined
      ) {
        return
      }

      const { winner, lengthMs } = round
      const score = { [Tf2Team.blu]: round.score.blu, [Tf2Team.red]: round.score.red }
      const captures = {
        [Tf2Team.blu]: round.captures?.[Tf2Team.blu] ?? [],
        [Tf2Team.red]: round.captures?.[Tf2Team.red] ?? [],
      }
      logger.info({ gameNumber, winner, lengthMs, score, captures }, `round ended`)

      const game = await findOne({ number: gameNumber }, ['score'])
      if (score.red === game.score?.red && score.blu === game.score.blu) {
        logger.info(`score is the same, not updating`)
        return
      }

      // On stopwatch (attack/defend & payload) rounds TF2 switches the teams'
      // sides afterwards. We defer the swap event to the next round start so the
      // final round doesn't produce a trailing swap.
      if (
        isStopwatchRound({
          previousScore: {
            [Tf2Team.blu]: game.score?.blu ?? 0,
            [Tf2Team.red]: game.score?.red ?? 0,
          },
          score,
          captures,
        })
      ) {
        await collections.gamesRoundProgress.updateOne(
          { gameNumber },
          { $set: { swapPending: true } },
          { upsert: true },
        )
      }

      await update(
        { number: gameNumber },
        {
          $set: {
            'score.blu': score.blu,
            'score.red': score.red,
          },
          $push: {
            events: {
              at: new Date(),
              event: GameEventType.roundEnded,
              winner,
              lengthMs,
              score: {
                [Tf2Team.red]: score.red,
                [Tf2Team.blu]: score.blu,
              },
              captures,
            },
          },
        },
      )
    }

    events.on('match:roundWon', async ({ gameNumber, winner }) => {
      await collections.gamesRoundProgress.updateOne(
        { gameNumber },
        { $set: { 'round.winner': winner } },
        { upsert: true },
      )
      await maybeRoundEnded(gameNumber)
    })

    events.on('match:roundLength', async ({ gameNumber, lengthMs }) => {
      await collections.gamesRoundProgress.updateOne(
        { gameNumber },
        { $set: { 'round.lengthMs': lengthMs } },
        { upsert: true },
      )
      await maybeRoundEnded(gameNumber)
    })

    events.on('match/score:reported', async ({ gameNumber, teamName, score }) => {
      await collections.gamesRoundProgress.updateOne(
        { gameNumber },
        { $set: { [`round.score.${teamName}`]: score } },
        { upsert: true },
      )
      await maybeRoundEnded(gameNumber)
    })

    events.on('match/controlPoint:captured', async ({ gameNumber, team, controlPoint }) => {
      await collections.gamesRoundProgress.updateOne(
        { gameNumber },
        {
          $push: { [`round.captures.${team}`]: controlPoint },
        },
        { upsert: true },
      )
    })

    events.on('match:started', async ({ gameNumber }) => {
      const before = await collections.gamesRoundProgress.findOneAndUpdate(
        { gameNumber, swapPending: true },
        { $set: { swapPending: false } },
      )
      if (!before) {
        return
      }
      logger.info({ gameNumber }, 'teams swapped sides')
      await update(
        { number: gameNumber },
        { $push: { events: { at: new Date(), event: GameEventType.teamsSwapped } } },
      )
    })

    events.on('match:ended', async ({ gameNumber }) => {
      await collections.gamesRoundProgress.deleteOne({ gameNumber })
    })
  },
  {
    name: 'track match rounds',
    encapsulate: true,
  },
)
