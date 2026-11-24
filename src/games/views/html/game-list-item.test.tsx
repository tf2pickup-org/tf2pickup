import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { GameListItem } from './game-list-item'
import { GameState, type GameModel, type GameNumber } from '../../../database/models/game.model'

vi.mock('../../../html/components/map-thumbnail', () => ({ MapThumbnail: () => <span /> }))

describe('GameListItem', () => {
  it('renders the BLU score before the RED score', () => {
    const html = (
      <GameListItem
        game={
          {
            number: 41 as GameNumber,
            state: GameState.ended,
            events: [{ at: new Date('2026-11-17T05:31:33') }],
            score: { blu: 3, red: 1 },
            map: 'cp_snakewater_final1',
            gamemode: ' 6v6',
          } as unknown as GameModel
        }
      />
    ) as string
    const scores = parse(html).querySelectorAll('.game-list-score > span')
    expect(scores.map(s => [s.getAttribute('data-team'), s.text.trim()])).toEqual([
      ['blu', 'BLU 3'],
      ['red', 'RED 1'],
    ])
  })
})
