import { describe, expect, it } from 'vitest'
import { Gamemode } from '../shared/types/gamemode'
import { mergeGamemodeConfiguration } from './merge-gamemode-configuration'

describe('mergeGamemodeConfiguration()', () => {
  it("takes the incoming default skill for gamemodes the primary didn't set", () => {
    expect(
      mergeGamemodeConfiguration(
        { 'games.default_player_skill': { '6v6': { medic: 2 } } },
        { 'games.default_player_skill': { '6v6': { medic: 7 }, '9v9': { spy: 3 } } },
        [Gamemode.highlander],
      ),
    ).toEqual({ 'games.default_player_skill': { '6v6': { medic: 2 }, '9v9': { spy: 3 } } })
  })

  it('changes nothing the primary already has', () => {
    expect(
      mergeGamemodeConfiguration(
        { 'games.default_player_skill': { '9v9': { spy: 1 } } },
        { 'games.default_player_skill': { '9v9': { spy: 3 } } },
        [Gamemode.highlander],
      ),
    ).toEqual({})
  })
})
