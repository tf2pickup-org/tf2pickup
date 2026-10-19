import { describe, expect, it, vi } from 'vitest'
import { Gamemode } from '../../shared/types/gamemode'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { configuration } from '../../configuration'
import { meetsSkillThreshold } from './meets-skill-threshold'

vi.mock('../../configuration', () => ({
  configuration: { get: vi.fn().mockResolvedValue({ '6v6': { soldier: 1 } }) },
}))

const slot = { gameClass: Tf2ClassName.soldier }

describe('meetsSkillThreshold()', () => {
  it("compares the player's skill with the threshold", async () => {
    const queue = { gamemode: Gamemode.sixes, skillThreshold: 3 }
    expect(await meetsSkillThreshold({ skill: { '6v6': { soldier: 3 } } }, slot, queue)).toBe(true)
    expect(await meetsSkillThreshold({ skill: { '6v6': { soldier: 2 } } }, slot, queue)).toBe(false)
    expect(await meetsSkillThreshold({}, slot, queue)).toBe(false)
  })

  it('treats a player with no skill and no default as skill 1', async () => {
    vi.mocked(configuration.get).mockResolvedValueOnce({})
    const queue = { gamemode: Gamemode.sixes, skillThreshold: 1 }
    expect(await meetsSkillThreshold({}, slot, queue)).toBe(true)
  })

  it('lets anyone in when the gamemode is not auto-balanced', async () => {
    const queue = { gamemode: Gamemode.ultiduo, skillThreshold: 3 }
    expect(await meetsSkillThreshold({}, slot, queue)).toBe(true)
  })
})
