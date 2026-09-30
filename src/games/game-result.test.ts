import { describe, expect, it } from 'vitest'
import { GameState, type GameModel } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2Team } from '../shared/types/tf2-team'
import { gameResult } from './game-result'

const player = '76561198074409147' as SteamId64
const game = (
  props: Partial<Pick<GameModel, 'state' | 'score'>> & { team?: Tf2Team },
): Pick<GameModel, 'state' | 'score' | 'slots'> =>
  ({
    state: props.state ?? GameState.ended,
    score: props.score,
    slots: [{ player, team: props.team ?? Tf2Team.red }],
  }) as Pick<GameModel, 'state' | 'score' | 'slots'>

describe('gameResult()', () => {
  it.each([
    [Tf2Team.red, { red: 3, blu: 1 }, 'win'],
    [Tf2Team.red, { red: 1, blu: 3 }, 'loss'],
    [Tf2Team.blu, { red: 1, blu: 3 }, 'win'],
    [Tf2Team.blu, { red: 2, blu: 2 }, 'tie'],
  ] as const)('reads the score from the player team (%s, %o → %s)', (team, score, result) => {
    expect(gameResult(game({ team, score }), player)).toBe(result)
  })

  it('marks interrupted games', () => {
    expect(gameResult(game({ state: GameState.interrupted }), player)).toBe('interrupted')
  })

  it('has no result while the game runs or without a score', () => {
    expect(gameResult(game({ state: GameState.started, score: { red: 1, blu: 0 } }), player)).toBe(
      undefined,
    )
    expect(gameResult(game({}), player)).toBe(undefined)
  })

  it('has no result for a player who did not play', () => {
    expect(gameResult(game({ score: { red: 1, blu: 0 } }), '1' as SteamId64)).toBe(undefined)
  })
})
