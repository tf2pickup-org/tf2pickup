import fp from 'fastify-plugin'
import { Tf2Team } from '../../shared/types/tf2-team'
import { events } from '../../events'
import { logger } from '../../logger'
import { update } from '../update'
import { findOne } from '../find-one'
import { safe } from '../../utils/safe'
import { GameEventType, type RoundEnded } from '../../database/models/game-event.model'
import { isStopwatchGame } from '../is-stopwatch-game'

type ScoreByTeam = Record<Tf2Team, number>

const noScore = (): ScoreByTeam => ({ [Tf2Team.blu]: 0, [Tf2Team.red]: 0 })

/**
 * On attack/defend & payload maps, TF2 never updates the "Team X final score"
 * counters, so they always report 0:0. These are stopwatch maps: each team
 * attacks once (the attacking team is always the in-game "Blue") and the teams
 * swap sides between rounds. TF2 already decides the winner of every round via
 * its Round_Win events, and that decision accounts for the swap — the roster
 * that set the benchmark keeps it after switching colours. The map is therefore
 * won 1:0 by the winner of the last round, which matches how logs.tf derives
 * the score for these maps.
 */
function computeAttackDefendScore(rounds: RoundEnded[]): ScoreByTeam {
  const score = noScore()
  const lastRound = rounds[rounds.length - 1]
  if (lastRound) {
    score[lastRound.winner] = 1
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

        // Only attack/defend & payload (stopwatch) maps report a broken 0:0
        // final score. On symmetric maps (cp/koth) TF2 reports the final score
        // correctly, so if this isn't a stopwatch game, leave the score
        // untouched.
        if (!isStopwatchGame(game.events)) {
          return
        }

        const computedScore = computeAttackDefendScore(rounds)
        logger.info(
          { gameNumber, score: computedScore },
          'final score reported as 0:0, recomputed from the last round winner',
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
