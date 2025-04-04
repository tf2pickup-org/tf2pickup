import fp from 'fastify-plugin'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { update } from '../update'
import { GameEventType } from '../../database/models/game-event.model'
import { findOne } from '../find-one'

interface RoundData {
  winner?: Tf2Team
  lengthMs?: number
  score?: {
    [Tf2Team.blu]?: number
    [Tf2Team.red]?: number
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const rounds = new Map<GameNumber, RoundData>()

    async function maybeRoundEnded() {
      for (const [gameNumber, value] of rounds) {
        if (
          value.winner &&
          value.lengthMs !== undefined &&
          value.score?.blu !== undefined &&
          value.score.red !== undefined
        ) {
          logger.info({ ...value, gameNumber }, `round ended`)

          const game = await findOne({ number: gameNumber })
          if (value.score.red === game.score?.red && value.score.blu === game.score.blu) {
            logger.info(`score is the same, not updating`)
            rounds.delete(gameNumber)
            continue
          }

          await update(
            { number: gameNumber },
            {
              $set: {
                'score.blu': value.score.blu,
                'score.red': value.score.red,
              },
              $push: {
                events: {
                  at: new Date(),
                  event: GameEventType.roundEnded,
                  winner: value.winner,
                  lengthMs: value.lengthMs,
                  score: {
                    [Tf2Team.red]: value.score.red,
                    [Tf2Team.blu]: value.score.blu,
                  },
                },
              },
            },
          )
          rounds.delete(gameNumber)
        }
      }
    }

    events.on('match:roundWon', async ({ gameNumber, winner }) => {
      const round = rounds.get(gameNumber) ?? {}
      rounds.set(gameNumber, { ...round, winner })
      await maybeRoundEnded()
    })

    events.on('match:roundLength', async ({ gameNumber, lengthMs }) => {
      const round = rounds.get(gameNumber) ?? {}
      rounds.set(gameNumber, { ...round, lengthMs })
      await maybeRoundEnded()
    })

    events.on('match/score:reported', async ({ gameNumber, teamName, score }) => {
      const round = rounds.get(gameNumber) ?? {}
      round.score = { ...round.score, [teamName]: score }
      rounds.set(gameNumber, round)
      await maybeRoundEnded()
    })
  },
  {
    name: 'track match rounds',
    encapsulate: true,
  },
)
