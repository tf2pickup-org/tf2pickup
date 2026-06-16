import fp from 'fastify-plugin'
import { Tf2Team } from '../../shared/types/tf2-team'
import { events } from '../../events'
import { logger } from '../../logger'
import { update } from '../update'
import { findOne } from '../find-one'
import { safe } from '../../utils/safe'
import { GameEventType, type RoundEnded } from '../../database/models/game-event.model'

type ScoreByTeam = Record<Tf2Team, number>

const noScore = (): ScoreByTeam => ({ [Tf2Team.blu]: 0, [Tf2Team.red]: 0 })

/**
 * On attack/defend payload maps, TF2 never updates the "Team X final score"
 * counters, so they always report 0:0. The actual outcome can be derived from
 * how many (new) control points each round's winner captured: a round only
 * "counts" if the winner made progress beyond what was already captured
 * earlier in the match, capped at the total number of control points on the
 * map. This mirrors how logs.tf derives the score for these maps.
 */
function computeAttackDefendScore(rounds: RoundEnded[]): ScoreByTeam {
  const capturedControlPoints = new Set<number>()
  for (const round of rounds) {
    for (const team of [Tf2Team.blu, Tf2Team.red]) {
      for (const controlPoint of round.captures?.[team] ?? []) {
        capturedControlPoints.add(controlPoint)
      }
    }
  }
  const totalControlPoints = capturedControlPoints.size

  const cumulative = noScore()
  const score = noScore()

  for (const round of rounds) {
    for (const team of [Tf2Team.blu, Tf2Team.red]) {
      const before = cumulative[team]
      const after = Math.min(totalControlPoints, before + (round.captures?.[team] ?? []).length)
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
    events.on(
      'match/score:final',
      safe(async ({ gameNumber, team, score }) => {
        await update(gameNumber, { $set: { [`score.${team}`]: score } })

        const game = await findOne({ number: gameNumber }, ['score', 'events'])
        if (game.score?.[Tf2Team.blu] !== 0 || game.score[Tf2Team.red] !== 0) {
          return
        }

        const rounds = game.events.filter(
          (event): event is RoundEnded => event.event === GameEventType.roundEnded,
        )
        if (rounds.length === 0) {
          return
        }

        // Only attack/defend & payload maps report a broken 0:0 final score. On
        // those, a single team attacks and captures control points while the
        // other only defends. On symmetric maps (cp/koth) both teams capture
        // points and TF2 reports the final score correctly, so if anything other
        // than a single team captured, leave the score untouched.
        const capturingTeams = new Set(
          rounds.flatMap(round =>
            [Tf2Team.blu, Tf2Team.red].filter(team => (round.captures?.[team] ?? []).length > 0),
          ),
        )
        if (capturingTeams.size !== 1) {
          return
        }

        const computedScore = computeAttackDefendScore(rounds)
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
      }),
    )
  },
  {
    name: 'track attack/defend score',
    encapsulate: true,
  },
)
