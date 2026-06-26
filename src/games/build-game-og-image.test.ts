import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildGameOgImage } from './build-game-og-image'
import { GameState, type GameNumber } from '../database/models/game.model'
import { Tf2Team } from '../shared/types/tf2-team'

function isPng(buffer: Buffer) {
  return buffer.subarray(1, 4).toString() === 'PNG'
}

describe('buildGameOgImage', () => {
  beforeEach(() => {
    // avoid hitting the external thumbnail service in tests
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('no network'))
  })

  it('renders a png for an ended game with a score', async () => {
    const image = await buildGameOgImage({
      number: 6797 as GameNumber,
      map: 'cp_process_f12',
      state: GameState.ended,
      score: { [Tf2Team.red]: 5, [Tf2Team.blu]: 4 },
    })
    expect(Buffer.isBuffer(image)).toBe(true)
    expect(isPng(image)).toBe(true)
  })

  it('renders a png for a game without a score', async () => {
    const image = await buildGameOgImage({
      number: 42 as GameNumber,
      map: 'koth_product_final',
      state: GameState.started,
    })
    expect(isPng(image)).toBe(true)
  })
})
