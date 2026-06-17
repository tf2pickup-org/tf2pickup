import { describe, it, expect } from 'vitest'
import { isStopwatchRound } from './is-stopwatch-round'
import { Tf2Team } from '../shared/types/tf2-team'

describe('isStopwatchRound', () => {
  it('detects a stopwatch round (score jumps by more than 1 with captures)', () => {
    expect(
      isStopwatchRound({
        previousScore: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
        score: { [Tf2Team.blu]: 4, [Tf2Team.red]: 0 },
        captures: { [Tf2Team.blu]: [0, 1, 2, 3], [Tf2Team.red]: [] },
      }),
    ).toBe(true)
  })

  it('is not a stopwatch round when the score only grew by 1 (cp/koth)', () => {
    expect(
      isStopwatchRound({
        previousScore: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
        score: { [Tf2Team.blu]: 1, [Tf2Team.red]: 0 },
        captures: { [Tf2Team.blu]: [0, 1, 2, 3, 4], [Tf2Team.red]: [] },
      }),
    ).toBe(false)
  })

  it('is not a stopwatch round when no control points were captured (ctf/bball)', () => {
    expect(
      isStopwatchRound({
        previousScore: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 },
        score: { [Tf2Team.blu]: 3, [Tf2Team.red]: 0 },
        captures: undefined,
      }),
    ).toBe(false)
  })
})
