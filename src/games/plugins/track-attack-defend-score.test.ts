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

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

import { events } from '../../events'
import { update } from '../update'
import { findOne } from '../find-one'
import { Tf2Team } from '../../shared/types/tf2-team'
import { GameEventType } from '../../database/models/game-event.model'
import plugin from './track-attack-defend-score'
import type { GameModel, GameNumber } from '../../database/models/game.model'

const gameNumber = 2784 as GameNumber

describe('track-attack-defend-score', () => {
  let scoreFinalHandler: (params: {
    gameNumber: GameNumber
    team: Tf2Team
    score: number
  }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(update).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()

    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'match/score:final')
    scoreFinalHandler = call![1] as typeof scoreFinalHandler
  })

  it('recomputes the score for an attack/defend map reporting a broken 0:0 final score', async () => {
    // round 1: blu pushes the cart all the way (4 control points)
    // round 2: blu pushes the cart all the way again, but it's already "used up"
    const events_: GameModel['events'] = [
      { event: GameEventType.gameCreated, at: new Date() },
      {
        event: GameEventType.roundEnded,
        at: new Date(),
        winner: Tf2Team.blu,
        lengthMs: 415_000,
        score: { [Tf2Team.blu]: 4, [Tf2Team.red]: 0 },
        captures: { [Tf2Team.blu]: [0, 1, 2, 3], [Tf2Team.red]: [] },
      },
      {
        event: GameEventType.roundEnded,
        at: new Date(),
        winner: Tf2Team.blu,
        lengthMs: 347_000,
        score: { [Tf2Team.blu]: 4, [Tf2Team.red]: 4 },
        captures: { [Tf2Team.blu]: [0, 1, 2, 3], [Tf2Team.red]: [] },
      },
    ]

    vi.mocked(findOne).mockResolvedValue({
      score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
      events: events_,
    } as never)

    await scoreFinalHandler({ gameNumber, team: Tf2Team.red, score: 0 })

    expect(update).toHaveBeenCalledWith(gameNumber, { $set: { 'score.red': 0 } })
    expect(update).toHaveBeenLastCalledWith(gameNumber, {
      $set: { 'score.blu': 1, 'score.red': 0 },
    })
  })

  it('does not recompute the score when the final score is non-zero', async () => {
    vi.mocked(findOne).mockResolvedValue({
      score: { [Tf2Team.blu]: 1, [Tf2Team.red]: 0 },
      events: [
        { event: GameEventType.gameCreated, at: new Date() },
        {
          event: GameEventType.roundEnded,
          at: new Date(),
          winner: Tf2Team.blu,
          lengthMs: 100_000,
          score: { [Tf2Team.blu]: 1, [Tf2Team.red]: 0 },
          captures: { [Tf2Team.blu]: [0], [Tf2Team.red]: [] },
        },
      ],
    } as never)

    await scoreFinalHandler({ gameNumber, team: Tf2Team.blu, score: 1 })

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(gameNumber, { $set: { 'score.blu': 1 } })
  })

  it('does not recompute the score on symmetric maps where both teams captured points', async () => {
    vi.mocked(findOne).mockResolvedValue({
      score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
      events: [
        { event: GameEventType.gameCreated, at: new Date() },
        {
          event: GameEventType.roundEnded,
          at: new Date(),
          winner: Tf2Team.blu,
          lengthMs: 100_000,
          score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
          captures: { [Tf2Team.blu]: [0, 1], [Tf2Team.red]: [2, 3] },
        },
      ],
    } as never)

    await scoreFinalHandler({ gameNumber, team: Tf2Team.blu, score: 0 })

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(gameNumber, { $set: { 'score.blu': 0 } })
  })

  it('does not recompute the score when no rounds were recorded', async () => {
    vi.mocked(findOne).mockResolvedValue({
      score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
      events: [{ event: GameEventType.gameCreated, at: new Date() }],
    } as never)

    await scoreFinalHandler({ gameNumber, team: Tf2Team.blu, score: 0 })

    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(gameNumber, { $set: { 'score.blu': 0 } })
  })

  it('only recomputes once both teams have reported a 0 final score', async () => {
    const game: GameModel = {
      score: { [Tf2Team.blu]: 4, [Tf2Team.red]: 4 },
      events: [
        { event: GameEventType.gameCreated, at: new Date() },
        {
          event: GameEventType.roundEnded,
          at: new Date(),
          winner: Tf2Team.blu,
          lengthMs: 415_000,
          score: { [Tf2Team.blu]: 4, [Tf2Team.red]: 0 },
          captures: { [Tf2Team.blu]: [0, 1, 2, 3], [Tf2Team.red]: [] },
        },
        {
          event: GameEventType.roundEnded,
          at: new Date(),
          winner: Tf2Team.blu,
          lengthMs: 347_000,
          score: { [Tf2Team.blu]: 4, [Tf2Team.red]: 4 },
          captures: { [Tf2Team.blu]: [0, 1, 2, 3], [Tf2Team.red]: [] },
        },
      ],
    } as unknown as GameModel

    vi.mocked(findOne).mockImplementation(() => Promise.resolve(game as never))
    vi.mocked(update).mockImplementation((_number: unknown, patch: unknown) => {
      for (const [key, value] of Object.entries((patch as { $set: Record<string, number> }).$set)) {
        const field = key.replace(/^score\./, '') as Tf2Team
        game.score![field] = value
      }
      return Promise.resolve(game as never)
    })

    // "Team Red final score 0" arrives first: blu is still 4, no recompute yet
    await scoreFinalHandler({ gameNumber, team: Tf2Team.red, score: 0 })
    expect(update).toHaveBeenCalledTimes(1)

    // "Team Blue final score 0" arrives next: both are now 0, recompute kicks in
    await scoreFinalHandler({ gameNumber, team: Tf2Team.blu, score: 0 })
    expect(update).toHaveBeenLastCalledWith(gameNumber, {
      $set: { 'score.blu': 1, 'score.red': 0 },
    })
  })
})
