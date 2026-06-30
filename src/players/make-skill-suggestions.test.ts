import { describe, expect, it, vi } from 'vitest'
import { makeSkillSuggestions } from './make-skill-suggestions'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { currentGamemode } from '../shared/current-gamemode'

vi.mock('../shared/current-gamemode', () => ({ currentGamemode: '6v6' }))

vi.mock('../queue-auto', () => ({
  queue: {
    config: {
      classes: [{ name: 'scout' }, { name: 'soldier' }],
    },
  },
}))

const mockActor = '76561198000000000' as SteamId64

const enoughGames = 10 // provisionalThreshold

function makePlayer(
  overrides: Partial<{
    elo: Partial<Record<Tf2ClassName, number>>
    gamesByClass: Partial<Record<Tf2ClassName, number>>
    lastSkillChangeGamesByClass: Partial<Record<Tf2ClassName, number>> | undefined
  }> = {},
) {
  const { elo = {}, gamesByClass = {}, lastSkillChangeGamesByClass = undefined } = overrides
  return {
    elo: { [currentGamemode]: elo },
    stats: {
      totalGames: 0,
      gamesByGamemode: {},
      gamesByClass: { [currentGamemode]: gamesByClass },
    },
    skillHistory:
      lastSkillChangeGamesByClass !== undefined
        ? [
            {
              at: new Date(),
              gamemode: currentGamemode,
              skill: {},
              actor: mockActor,
              gamesByClass: lastSkillChangeGamesByClass,
            },
          ]
        : undefined,
  }
}

describe('makeSkillSuggestions()', () => {
  describe('when elo is above threshold', () => {
    it('suggests up', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1551 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      const result = makeSkillSuggestions({ player })
      expect(result.get(Tf2ClassName.scout)).toBe('up')
    })
  })

  describe('when elo is below threshold', () => {
    it('suggests down', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1449 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      const result = makeSkillSuggestions({ player })
      expect(result.get(Tf2ClassName.scout)).toBe('down')
    })
  })

  describe('when elo is exactly at upper threshold', () => {
    it('returns no suggestion', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1550 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBeUndefined()
    })
  })

  describe('when elo is exactly at lower threshold', () => {
    it('returns no suggestion', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1450 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBeUndefined()
    })
  })

  describe('when elo is in range', () => {
    it('returns no suggestion', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1500 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBeUndefined()
    })
  })

  describe('when player has fewer games than provisionalThreshold', () => {
    it('returns no suggestion', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1600 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames - 1 },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBeUndefined()
    })
  })

  describe('when elo is undefined for a class', () => {
    it('returns no suggestion', () => {
      const player = makePlayer({
        elo: {},
        gamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBeUndefined()
    })
  })

  describe('cooldown after skill change', () => {
    it('suppresses suggestion within 3 games of last skill change', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1600 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames + 2 },
        lastSkillChangeGamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBeUndefined()
    })

    it('shows suggestion after cooldown has passed', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1600 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames + 3 },
        lastSkillChangeGamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBe('up')
    })

    it('applies cooldown per class independently', () => {
      const player = makePlayer({
        elo: {
          [Tf2ClassName.scout]: 1600,
          [Tf2ClassName.soldier]: 1600,
        },
        gamesByClass: {
          [Tf2ClassName.scout]: enoughGames + 2, // still in cooldown
          [Tf2ClassName.soldier]: enoughGames + 3, // past cooldown
        },
        lastSkillChangeGamesByClass: {
          [Tf2ClassName.scout]: enoughGames,
          [Tf2ClassName.soldier]: enoughGames,
        },
      })
      const result = makeSkillSuggestions({ player })
      expect(result.get(Tf2ClassName.scout)).toBeUndefined()
      expect(result.get(Tf2ClassName.soldier)).toBe('up')
    })

    it('skips cooldown when last skill change has no gamesByClass snapshot', () => {
      const player = {
        elo: { [currentGamemode]: { [Tf2ClassName.scout]: 1600 } },
        stats: {
          totalGames: 0,
          gamesByGamemode: {},
          gamesByClass: { [currentGamemode]: { [Tf2ClassName.scout]: enoughGames } },
        },
        skillHistory: [{ at: new Date(), gamemode: currentGamemode, skill: {}, actor: mockActor }],
      }
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBe('up')
    })
  })

  describe('when player has no skill history', () => {
    it('shows suggestion without applying cooldown', () => {
      const player = makePlayer({
        elo: { [Tf2ClassName.scout]: 1600 },
        gamesByClass: { [Tf2ClassName.scout]: enoughGames },
      })
      expect(makeSkillSuggestions({ player }).get(Tf2ClassName.scout)).toBe('up')
    })
  })

  it('returns suggestions for multiple classes', () => {
    const player = makePlayer({
      elo: {
        [Tf2ClassName.scout]: 1600,
        [Tf2ClassName.soldier]: 1400,
      },
      gamesByClass: {
        [Tf2ClassName.scout]: enoughGames,
        [Tf2ClassName.soldier]: enoughGames,
      },
    })
    const result = makeSkillSuggestions({ player })
    expect(result.get(Tf2ClassName.scout)).toBe('up')
    expect(result.get(Tf2ClassName.soldier)).toBe('down')
  })
})
