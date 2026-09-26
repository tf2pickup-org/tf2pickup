import { describe, it, expect } from 'vitest'
import { Tf2GameAnalyzer } from './tf2-game-analyzer'
import { createGameContext } from './create-game-context'

const roundStart = '07/13/2026 - 17:00:00: World triggered "Round_Start"'

describe('Tf2GameAnalyzer', () => {
  it('starts clean', () => {
    expect(new Tf2GameAnalyzer().contextDirty()).toBe(false)
  })

  it('becomes dirty after a line that changes the context', () => {
    const analyzer = new Tf2GameAnalyzer()
    analyzer.parseLine(roundStart)
    expect(analyzer.contextDirty()).toBe(true)
  })

  it('stays clean after a line that does not change the context', () => {
    const analyzer = new Tf2GameAnalyzer()
    analyzer.parseLine('07/13/2026 - 17:00:00: some unrecognized line')
    expect(analyzer.contextDirty()).toBe(false)
  })

  it('is clean again after markPersisted', () => {
    const analyzer = new Tf2GameAnalyzer()
    analyzer.parseLine(roundStart)
    analyzer.markPersisted()
    expect(analyzer.contextDirty()).toBe(false)
  })

  it('parses events and exposes the mutated context', () => {
    const analyzer = new Tf2GameAnalyzer()
    expect(analyzer.parseLine(roundStart)).toEqual([{ event: 'round started' }])
    expect(analyzer.context.seenRoundStart).toBe(true)
  })

  it('rehydrates from an existing context and starts clean', () => {
    const seed = createGameContext()
    seed.score.red = 3
    const analyzer = new Tf2GameAnalyzer(seed)
    expect(analyzer.context.score.red).toBe(3)
    expect(analyzer.contextDirty()).toBe(false)
  })
})
