import fp from 'fastify-plugin'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { update } from '../update'
import { GameEventType } from '../../database/models/game-event.model'
import { findOne } from '../find-one'
import { isStopwatchRound } from '../is-stopwatch-round'

interface RoundData {
  winner?: Tf2Team
  lengthMs?: number
  score?: {
    [Tf2Team.blu]?: number
    [Tf2Team.red]?: number
  }
  captures?: {
    [Tf2Team.blu]: number[]
    [Tf2Team.red]: number[]
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const rounds = new Map<GameNumber, RoundData>()
    // games whose teams will switch sides when the next round starts (see the
    // attack/defend detection in maybeRoundEnded below)
    const swapPending = new Set<GameNumber>()

    async function maybeRoundEnded() {
      for (const [gameNumber, value] of rounds) {
        if (
          value.winner &&
          value.lengthMs !== undefined &&
          value.score?.blu !== undefined &&
          value.score.red !== undefined
        ) {
          logger.info({ ...value, gameNumber }, `round ended`)

          const game = await findOne({ number: gameNumber }, ['score'])
          if (value.score.red === game.score?.red && value.score.blu === game.score.blu) {
            logger.info(`score is the same, not updating`)
            rounds.delete(gameNumber)
            continue
          }

          // On stopwatch (attack/defend & payload) rounds TF2 switches the
          // teams' sides afterwards. We defer the swap event to the next round
          // start so the final round doesn't produce a trailing swap.
          if (
            isStopwatchRound({
              previousScore: {
                [Tf2Team.blu]: game.score?.blu ?? 0,
                [Tf2Team.red]: game.score?.red ?? 0,
              },
              score: { [Tf2Team.blu]: value.score.blu, [Tf2Team.red]: value.score.red },
              captures: value.captures,
            })
          ) {
            swapPending.add(gameNumber)
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
                  captures: value.captures ?? {
                    [Tf2Team.blu]: [],
                    [Tf2Team.red]: [],
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

    events.on('match/controlPoint:captured', ({ gameNumber, team, controlPoint }) => {
      const round = rounds.get(gameNumber) ?? {}
      const captures = round.captures ?? { [Tf2Team.blu]: [], [Tf2Team.red]: [] }
      captures[team] = [...captures[team], controlPoint]
      rounds.set(gameNumber, { ...round, captures })
    })

    events.on('match:started', async ({ gameNumber }) => {
      if (!swapPending.has(gameNumber)) {
        return
      }
      swapPending.delete(gameNumber)
      logger.info({ gameNumber }, 'teams swapped sides')
      await update(
        { number: gameNumber },
        { $push: { events: { at: new Date(), event: GameEventType.teamsSwapped } } },
      )
    })

    events.on('match:ended', ({ gameNumber }) => {
      swapPending.delete(gameNumber)
    })
  },
  {
    name: 'track match rounds',
    encapsulate: true,
  },
)
