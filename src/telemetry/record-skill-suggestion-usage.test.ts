import { afterEach, describe, expect, it, vi } from 'vitest'
import { recordSkillSuggestionUsage } from './record-skill-suggestion-usage'
import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { makeSkillSuggestions } from '../players/make-skill-suggestions'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

vi.mock('../configuration', () => ({ configuration: { get: vi.fn() } }))

vi.mock('../database/collections', () => ({
  collections: { telemetryStats: { updateOne: vi.fn() } },
}))

vi.mock('../players/make-skill-suggestions', () => ({ makeSkillSuggestions: vi.fn() }))

const player = { elo: {}, stats: { gamesByClass: {} }, skillHistory: [] }

function configReturns(enabled: boolean) {
  vi.mocked(configuration.get).mockImplementation((key: string) =>
    Promise.resolve((key === 'games.skill_suggestions' ? enabled : { soldier: 1 }) as never),
  )
}

function suggest(entries: [Tf2ClassName, 'up' | 'down'][]) {
  vi.mocked(makeSkillSuggestions).mockReturnValue(new Map(entries))
}

afterEach(() => vi.clearAllMocks())

describe('recordSkillSuggestionUsage', () => {
  it('records nothing when suggestions are disabled', async () => {
    configReturns(false)
    await recordSkillSuggestionUsage({ player, oldSkill: {}, newSkill: { soldier: 5 } })
    expect(collections.telemetryStats.updateOne).not.toHaveBeenCalled()
  })

  it('counts a save that follows an "up" suggestion as applied', async () => {
    configReturns(true)
    suggest([['soldier' as Tf2ClassName, 'up']])
    await recordSkillSuggestionUsage({
      player,
      oldSkill: { soldier: 3 },
      newSkill: { soldier: 5 },
    })
    const inc = vi.mocked(collections.telemetryStats.updateOne).mock.calls[0]![1] as {
      $inc: Record<string, number>
    }
    expect(inc.$inc).toEqual({ adminSkillChanges: 1, skillSuggestionsApplied: 1 })
  })

  it('does not count a save that moves against the suggestion', async () => {
    configReturns(true)
    suggest([['soldier' as Tf2ClassName, 'up']])
    await recordSkillSuggestionUsage({
      player,
      oldSkill: { soldier: 5 },
      newSkill: { soldier: 3 },
    })
    const inc = vi.mocked(collections.telemetryStats.updateOne).mock.calls[0]![1] as {
      $inc: Record<string, number>
    }
    expect(inc.$inc).toEqual({ adminSkillChanges: 1, skillSuggestionsApplied: 0 })
  })

  it('counts the save but not an application when there are no suggestions', async () => {
    configReturns(true)
    suggest([])
    await recordSkillSuggestionUsage({ player, oldSkill: {}, newSkill: { soldier: 9 } })
    const inc = vi.mocked(collections.telemetryStats.updateOne).mock.calls[0]![1] as {
      $inc: Record<string, number>
    }
    expect(inc.$inc).toEqual({ adminSkillChanges: 1, skillSuggestionsApplied: 0 })
  })
})
