import fp from 'fastify-plugin'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { update } from '../update'
import { safe } from '../../utils/safe'

interface RoundCaptures {
  [Tf2Team.blu]: number
  [Tf2Team.red]: number
}

interface MatchData {
  rounds: { winner: Tf2Team; captures: RoundCaptures }[]
  currentRoundCaptures: RoundCaptures
  capturedControlPoints: Set<number>
  pendingWinner?: Tf2Team | undefined
  finalScores: Partial<RoundCaptures>
}

const noCaptures = (): RoundCaptures => ({ [Tf2Team.blu]: 0, [Tf2Team.red]: 0 })

/**
 * On attack/defend payload maps, TF2 never updates the "Team X final score"
 * counters, so they always report 0:0. The actual outcome can be derived from
 * how many (new) control points each round's winner captured: a round only
 * "counts" if the winner made progress beyond what was already captured
 * earlier in the match, capped at the total number of control points on the
 * map. This mirrors how logs.tf derives the score for these maps.
 */
function computeAttackDefendScore(matchData: MatchData): RoundCaptures {
  const totalControlPoints = matchData.capturedControlPoints.size
  const cumulative = noCaptures()
  const score = noCaptures()

  for (const round of matchData.rounds) {
    for (const team of [Tf2Team.blu, Tf2Team.red]) {
      const before = cumulative[team]
      const after = Math.min(totalControlPoints, before + round.captures[team])
      cumulative[team] = after
      if (team === round.winner && after > before) {
        score[team] += 1
      }
    }
  }

  return score
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const matches = new Map<GameNumber, MatchData>()

    const reset = (gameNumber: GameNumber) =>
      matches.set(gameNumber, {
        rounds: [],
        currentRoundCaptures: noCaptures(),
        capturedControlPoints: new Set(),
        finalScores: {},
      })

    events.on('match:started', ({ gameNumber }) => reset(gameNumber))
    events.on('match:restarted', ({ gameNumber }) => reset(gameNumber))

    events.on('match:roundWon', ({ gameNumber, winner }) => {
      const matchData = matches.get(gameNumber)
      if (matchData) {
        matchData.pendingWinner = winner
      }
    })

    events.on('match:roundLength', ({ gameNumber }) => {
      const matchData = matches.get(gameNumber)
      if (!matchData?.pendingWinner) {
        return
      }

      matchData.rounds.push({
        winner: matchData.pendingWinner,
        captures: matchData.currentRoundCaptures,
      })
      matchData.currentRoundCaptures = noCaptures()
      matchData.pendingWinner = undefined
    })

    events.on('match/controlPoint:captured', ({ gameNumber, team, controlPoint }) => {
      const matchData = matches.get(gameNumber)
      if (!matchData) {
        return
      }

      matchData.currentRoundCaptures[team] += 1
      matchData.capturedControlPoints.add(controlPoint)
    })

    events.on(
      'match/score:final',
      safe(async ({ gameNumber, team, score }) => {
        await update(gameNumber, { $set: { [`score.${team}`]: score } })

        const matchData = matches.get(gameNumber)
        if (!matchData) {
          return
        }

        matchData.finalScores[team] = score
        const { [Tf2Team.blu]: blu, [Tf2Team.red]: red } = matchData.finalScores
        if (blu === undefined || red === undefined) {
          return
        }

        if (
          blu === 0 &&
          red === 0 &&
          matchData.rounds.length > 0 &&
          matchData.capturedControlPoints.size > 0
        ) {
          const computedScore = computeAttackDefendScore(matchData)
          logger.info(
            { gameNumber, score: computedScore },
            'final score reported as 0:0, recomputed from control point captures',
          )
          await update(gameNumber, {
            $set: {
              'score.blu': computedScore[Tf2Team.blu],
              'score.red': computedScore[Tf2Team.red],
            },
          })
        }

        matches.delete(gameNumber)
      }),
    )
  },
  {
    name: 'track attack/defend score',
    encapsulate: true,
  },
)
