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

  it("turns the incoming global whitelist into its gamemode's whitelist", () => {
    expect(
      mergeGamemodeConfiguration(
        { 'games.whitelist_id': 'etf2l_6v6' },
        { 'games.whitelist_id': 'etf2l_9v9' },
        [Gamemode.highlander],
      ),
    ).toEqual({ 'games.gamemode_whitelist_ids': { '9v9': 'etf2l_9v9' } })
  })

  it('changes nothing the primary already has', () => {
    expect(
      mergeGamemodeConfiguration(
        { 'games.whitelist_id': 'same', 'games.gamemode_whitelist_ids': { '9v9': 'mine' } },
        { 'games.whitelist_id': 'same', 'games.gamemode_whitelist_ids': { '9v9': 'theirs' } },
        [Gamemode.highlander],
      ),
    ).toEqual({})
    expect(
      mergeGamemodeConfiguration(
        { 'games.whitelist_id': 'same' },
        { 'games.whitelist_id': 'same' },
        [Gamemode.highlander],
      ),
    ).toEqual({})
  })
})
