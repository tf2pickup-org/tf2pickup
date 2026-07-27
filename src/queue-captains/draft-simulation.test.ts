import { describe, expect, it } from 'vitest'
import { _6v6 } from '../queue-auto/configs/6v6'
import { _9v9 } from '../queue-auto/configs/9v9'
import type { QueueConfig } from '../queue/types/queue-config'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import { Tf2Team } from '../shared/types/tf2-team'
import { legalPicks } from './matching/legal-picks'
import { queueReadiness } from './matching/queue-readiness'
import { pickOrder } from './pick-order'
import { teamSlots } from './team-slots'
import type { DraftCandidate } from './types/draft-candidate'

// deterministic, so a failure is always reproducible from its seed
function makeRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function makePool(random: () => number, size: number, config: QueueConfig): DraftCandidate[] {
  const classes = config.classes.map(({ name }) => name)
  return Array.from({ length: size }, (_, index) => {
    const gameClasses = classes.filter(() => random() < 0.45)
    if (gameClasses.length === 0) {
      gameClasses.push(classes[Math.floor(random() * classes.length)]!)
    }
    return { steamId: `player-${index}` as unknown as SteamId64, gameClasses }
  })
}

/**
 * Play a whole draft out, always taking the first legal pick. Throws the moment a captain is left
 * with nothing to choose — the dead-end this whole module exists to prevent.
 */
function runDraft(pool: DraftCandidate[], config: QueueConfig) {
  const captains: Record<Tf2Team, SteamId64> = {
    [Tf2Team.blu]: pool[0]!.steamId,
    [Tf2Team.red]: pool[1]!.steamId,
  }
  let candidates: DraftCandidate[] = pool.map((candidate, index) => ({
    ...candidate,
    ...(index === 0 && { team: Tf2Team.blu }),
    ...(index === 1 && { team: Tf2Team.red }),
  }))
  let openSlots = teamSlots(config)
  const picked: { steamId: SteamId64; gameClass: Tf2ClassName; team: Tf2Team }[] = []

  for (const team of pickOrder(config)) {
    const picks = legalPicks({ openSlots, candidates, team })
    if (picks.length === 0) {
      throw new Error(`dead end on turn ${picked.length + 1} for ${team}`)
    }

    const pick = picks[0]!
    const slot = openSlots.findIndex(
      open => open.team === team && open.gameClass === pick.gameClass,
    )
    openSlots = openSlots.filter((_, index) => index !== slot)
    candidates = candidates.filter(candidate => candidate.steamId !== pick.steamId)
    picked.push({ ...pick, team })
  }

  return { picked, openSlots, candidates, captains }
}

describe('a draft driven by legalPicks()', () => {
  describe.each([
    ['6v6', _6v6, 12],
    ['9v9', _9v9, 18],
  ])('%s', (_name, config, required) => {
    // generated pools, keeping only the ones the queue would have accepted as full
    const pools = Array.from({ length: 150 }, (_, seed) => {
      const random = makeRandom(seed + 1)
      return makePool(random, required + (seed % 5), config)
    }).filter(pool => queueReadiness(pool, config).fillable === required)

    // each draft is played out once and then asserted on from every angle
    const outcomes = pools.map(pool => {
      try {
        return { pool, draft: runDraft(pool, config), deadEnd: null as string | null }
      } catch (error) {
        return { pool, draft: null, deadEnd: (error as Error).message }
      }
    })
    const drafts = outcomes.flatMap(outcome =>
      outcome.draft === null ? [] : [{ pool: outcome.pool, ...outcome.draft }],
    )

    it('generates enough ready pools to be worth anything', () => {
      expect(pools.length).toBeGreaterThan(20)
    })

    it('never dead-ends', () => {
      expect(outcomes.flatMap(outcome => outcome.deadEnd ?? [])).toEqual([])
    })

    it('leaves exactly one slot per team, for the two captains', () => {
      for (const { openSlots } of drafts) {
        expect(openSlots).toHaveLength(2)
        expect(openSlots.map(slot => slot.team).sort()).toEqual([Tf2Team.blu, Tf2Team.red])
      }
    })

    it('leaves each captain a slot they can actually play', () => {
      for (const { openSlots, candidates, captains } of drafts) {
        for (const team of [Tf2Team.blu, Tf2Team.red]) {
          const captain = candidates.find(candidate => candidate.steamId === captains[team])!
          const slot = openSlots.find(open => open.team === team)!
          expect(captain.gameClasses).toContain(slot.gameClass)
        }
      }
    })

    it('never picks the same player twice, nor a captain', () => {
      for (const { picked, captains } of drafts) {
        const steamIds = picked.map(pick => pick.steamId)
        expect(new Set(steamIds).size).toBe(steamIds.length)
        expect(steamIds).not.toContain(captains[Tf2Team.blu])
        expect(steamIds).not.toContain(captains[Tf2Team.red])
      }
    })

    it('only ever picks a class the player signed up for', () => {
      for (const { pool, picked } of drafts) {
        for (const pick of picked) {
          const player = pool.find(candidate => candidate.steamId === pick.steamId)!
          expect(player.gameClasses).toContain(pick.gameClass)
        }
      }
    })
  })
})
