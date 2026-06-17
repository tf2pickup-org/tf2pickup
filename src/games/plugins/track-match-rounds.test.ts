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
    error: vi.fn(),
  },
}))

vi.mock('../update', () => ({
  update: vi.fn(),
}))

vi.mock('../find-one', () => ({
  findOne: vi.fn(),
}))

import { events } from '../../events'
import { update } from '../update'
import { findOne } from '../find-one'
import { Tf2Team } from '../../shared/types/tf2-team'
import { GameEventType } from '../../database/models/game-event.model'
import plugin from './track-match-rounds'
import type { GameNumber } from '../../database/models/game.model'

const gameNumber = 2784 as GameNumber

// grab the handler registered for a given event via events.on()
type Handler = (params: never) => void | Promise<void>
function handlerFor(event: string): Handler {
  const call = vi
    .mocked(events.on)
    .mock.calls.find(([name]: [string, ...unknown[]]) => name === event)
  return call![1] as Handler
}

describe('track-match-rounds', () => {
  // feeds a complete round (winner + length + both reported scores) and the
  // control points captured by each team, then ends the round
  async function playRound(opts: {
    winner: Tf2Team
    score: { blu: number; red: number }
    captures: { blu: number[]; red: number[] }
  }) {
    for (const cp of opts.captures.blu) {
      handlerFor('match/controlPoint:captured')({
        gameNumber,
        team: Tf2Team.blu,
        controlPoint: cp,
      } as never)
    }
    for (const cp of opts.captures.red) {
      handlerFor('match/controlPoint:captured')({
        gameNumber,
        team: Tf2Team.red,
        controlPoint: cp,
      } as never)
    }
    await handlerFor('match:roundWon')({ gameNumber, winner: opts.winner } as never)
    await handlerFor('match:roundLength')({ gameNumber, lengthMs: 300_000 } as never)
    await handlerFor('match/score:reported')({
      gameNumber,
      teamName: Tf2Team.blu,
      score: opts.score.blu,
    } as never)
    await handlerFor('match/score:reported')({
      gameNumber,
      teamName: Tf2Team.red,
      score: opts.score.red,
    } as never)
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(update).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()
  })

  it('emits a teams swapped event when a stopwatch round ends and the next round starts', async () => {
    // attack/defend round: blu caps 4 control points, score jumps 0 -> 4
    vi.mocked(findOne).mockResolvedValue({ score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 } } as never)
    await playRound({
      winner: Tf2Team.blu,
      score: { blu: 4, red: 0 },
      captures: { blu: [0, 1, 2, 3], red: [] },
    })

    // the swap is only recorded once the next round actually starts
    expect(update).not.toHaveBeenCalledWith(
      { number: gameNumber },
      { $push: { events: { at: expect.any(Date), event: GameEventType.teamsSwapped } } },
    )

    await handlerFor('match:started')({ gameNumber } as never)

    expect(update).toHaveBeenCalledWith(
      { number: gameNumber },
      { $push: { events: { at: expect.any(Date), event: GameEventType.teamsSwapped } } },
    )
  })

  it('does not emit a teams swapped event on a cp/koth round', async () => {
    // both teams capture and the score only grows by 1 (round counter)
    vi.mocked(findOne).mockResolvedValue({ score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 } } as never)
    await playRound({
      winner: Tf2Team.blu,
      score: { blu: 1, red: 0 },
      captures: { blu: [0, 1], red: [2, 3] },
    })

    await handlerFor('match:started')({ gameNumber } as never)

    expect(update).not.toHaveBeenCalledWith(
      { number: gameNumber },
      { $push: { events: { at: expect.any(Date), event: GameEventType.teamsSwapped } } },
    )
  })

  it('does not emit a teams swapped event when no control points were captured', async () => {
    // a score jump > 1 without any captures (e.g. ctf/bball) is not a swap
    vi.mocked(findOne).mockResolvedValue({ score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 } } as never)
    await playRound({
      winner: Tf2Team.blu,
      score: { blu: 3, red: 0 },
      captures: { blu: [], red: [] },
    })

    await handlerFor('match:started')({ gameNumber } as never)

    expect(update).not.toHaveBeenCalledWith(
      { number: gameNumber },
      { $push: { events: { at: expect.any(Date), event: GameEventType.teamsSwapped } } },
    )
  })

  it('does not emit a trailing swap when the match ends instead of starting a new round', async () => {
    vi.mocked(findOne).mockResolvedValue({ score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 } } as never)
    await playRound({
      winner: Tf2Team.blu,
      score: { blu: 4, red: 0 },
      captures: { blu: [0, 1, 2, 3], red: [] },
    })

    // match ends; the pending swap must be discarded, not flushed on a later start
    handlerFor('match:ended')({ gameNumber } as never)
    await handlerFor('match:started')({ gameNumber } as never)

    expect(update).not.toHaveBeenCalledWith(
      { number: gameNumber },
      { $push: { events: { at: expect.any(Date), event: GameEventType.teamsSwapped } } },
    )
  })
})
