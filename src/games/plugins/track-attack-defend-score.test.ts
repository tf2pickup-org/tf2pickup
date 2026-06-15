import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}))

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
  },
}))

vi.mock('../update', () => ({
  update: vi.fn(),
}))

import { events } from '../../events'
import { update } from '../update'
import { Tf2Team } from '../../shared/types/tf2-team'
import plugin from './track-attack-defend-score'
import type { GameNumber } from '../../database/models/game.model'

const gameNumber = 2784 as GameNumber

describe('track-attack-defend-score', () => {
  let handlers: Record<string, (params: never) => unknown>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(update).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()

    handlers = {}
    for (const [event, handler] of vi.mocked(events.on).mock.calls) {
      handlers[event as string] = handler as (params: never) => unknown
    }
  })

  async function playRound(winner: Tf2Team, captures: Partial<Record<Tf2Team, number>>) {
    handlers['match:roundWon']!({ gameNumber, winner } as never)
    for (const [team, count] of Object.entries(captures)) {
      for (let cp = 0; cp < (count ?? 0); cp++) {
        handlers['match/controlPoint:captured']!({
          gameNumber,
          team: team as Tf2Team,
          controlPoint: cp,
        } as never)
      }
    }
    await handlers['match:roundLength']!({ gameNumber, lengthMs: 1000 } as never)
  }

  it('recomputes the score for an attack/defend map reporting a broken 0:0 final score', async () => {
    handlers['match:started']!({ gameNumber } as never)

    // round 1: blu pushes the cart all the way (4 control points)
    await playRound(Tf2Team.blu, { [Tf2Team.blu]: 4 })
    // round 2: blu pushes the cart all the way again, but it's already "used up"
    await playRound(Tf2Team.blu, { [Tf2Team.blu]: 4 })

    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.red, score: 0 } as never)
    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.blu, score: 0 } as never)

    expect(update).toHaveBeenCalledWith(gameNumber, { $set: { 'score.red': 0 } })
    expect(update).toHaveBeenCalledWith(gameNumber, { $set: { 'score.blu': 0 } })
    expect(update).toHaveBeenLastCalledWith(gameNumber, {
      $set: { 'score.blu': 1, 'score.red': 0 },
    })
  })

  it('does not recompute the score when the final score is non-zero', async () => {
    handlers['match:started']!({ gameNumber } as never)

    await playRound(Tf2Team.blu, { [Tf2Team.blu]: 1 })

    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.red, score: 0 } as never)
    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.blu, score: 1 } as never)

    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenLastCalledWith(gameNumber, { $set: { 'score.blu': 1 } })
  })

  it('does not recompute the score when no rounds were tracked', async () => {
    handlers['match:started']!({ gameNumber } as never)

    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.red, score: 0 } as never)
    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.blu, score: 0 } as never)

    expect(update).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenLastCalledWith(gameNumber, { $set: { 'score.blu': 0 } })
  })

  it('resets tracked state when the match restarts', async () => {
    handlers['match:started']!({ gameNumber } as never)
    await playRound(Tf2Team.blu, { [Tf2Team.blu]: 4 })

    handlers['match:restarted']!({ gameNumber } as never)
    await playRound(Tf2Team.blu, { [Tf2Team.blu]: 4 })

    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.red, score: 0 } as never)
    await handlers['match/score:final']!({ gameNumber, team: Tf2Team.blu, score: 0 } as never)

    // only one round was tracked after the restart, and it counts as a win
    expect(update).toHaveBeenLastCalledWith(gameNumber, {
      $set: { 'score.blu': 1, 'score.red': 0 },
    })
  })
})
