import { describe, it, expect } from 'vitest'
import { isStopwatchGame } from './is-stopwatch-game'
import { Tf2Team } from '../shared/types/tf2-team'
import { GameEventType, type GameEventModel } from '../database/models/game-event.model'

const roundEnded = (
  score: Record<Tf2Team, number>,
  captures: Record<Tf2Team, number[]>,
): GameEventModel => ({
  event: GameEventType.roundEnded,
  at: new Date(),
  winner: Tf2Team.blu,
  lengthMs: 100_000,
  score,
  captures,
})

describe('isStopwatchGame', () => {
  it('is a stopwatch game when any round is a stopwatch round', () => {
    expect(
      isStopwatchGame([
        { event: GameEventType.gameCreated, at: new Date() },
        roundEnded(
          { [Tf2Team.blu]: 4, [Tf2Team.red]: 0 },
          { [Tf2Team.blu]: [0, 1, 2, 3], [Tf2Team.red]: [] },
        ),
      ]),
    ).toBe(true)
  })

  it('is not a stopwatch game on symmetric maps where both teams capture', () => {
    expect(
      isStopwatchGame([
        roundEnded(
          { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
          { [Tf2Team.blu]: [0, 1], [Tf2Team.red]: [2, 3] },
        ),
      ]),
    ).toBe(false)
  })

  it('is not a stopwatch game without any rounds', () => {
    expect(isStopwatchGame([{ event: GameEventType.gameCreated, at: new Date() }])).toBe(false)
  })
})
