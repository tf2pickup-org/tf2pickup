import { describe, expect, it } from 'vitest'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { effectiveSkill } from './effective-skill'

describe('effectiveSkill()', () => {
  it.each([
    [{ soldier: 4 }, { soldier: 2 }, 4],
    [{ scout: 4 }, { soldier: 2 }, 2],
    [undefined, { soldier: 2 }, 2],
    [{ soldier: 0 }, { soldier: 2 }, 0],
    [undefined, undefined, 1],
    [{}, {}, 1],
  ])('player %o, default %o → %d', (playerSkill, defaultSkill, expected) => {
    expect(effectiveSkill(playerSkill, defaultSkill, Tf2ClassName.soldier)).toBe(expected)
  })
})
