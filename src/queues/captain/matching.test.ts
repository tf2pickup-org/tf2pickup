import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { secondsToMilliseconds } from 'date-fns'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Tf2Team } from '../../shared/types/tf2-team'
import { draftTurns } from './draft-turns'
import { chooseCaptainPair } from './choose-captain-pair'
import { eligibleCaptainPairs } from './eligible-captain-pairs'
import { finalCaptainRoles } from './final-captain-roles'
import { isDraftCompletable } from './is-draft-completable'
import { legalPicks } from './legal-picks'
import { matchRoleSlots } from './match-role-slots'
import { poolReadiness } from './pool-readiness'
import { roleKey } from './role-key'
import { roleSlots } from './role-slots'
import { timeoutPick } from './timeout-pick'
import type { CaptainRole } from './types/captain-role'
import type { DraftPosition } from './types/draft-position'
import type { PoolPlayer } from './types/pool-player'

const sixRoles: CaptainRole[] = [
  { name: 'pocket', gameClass: Tf2ClassName.scout },
  { name: 'flank', gameClass: Tf2ClassName.scout },
  { name: 'pocket', gameClass: Tf2ClassName.soldier },
  { name: 'roamer', gameClass: Tf2ClassName.soldier },
  { name: 'demoman', gameClass: Tf2ClassName.demoman },
  { name: 'medic', gameClass: Tf2ClassName.medic },
]
const nineRoles = Object.values(Tf2ClassName).map(gameClass => ({ name: gameClass, gameClass }))
const smallRoles = sixRoles.slice(0, 2)
const smallKeys = smallRoles.map(roleKey)

function member(id: number, roles: readonly string[], volunteer = false): PoolPlayer {
  return {
    player: { steamId: `7656119800000${String(id).padStart(4, '0')}` as SteamId64 },
    roles,
    volunteer,
    joinedAt: new Date(secondsToMilliseconds(id)),
  }
}

function position(pool: PoolPlayer[], roles = smallRoles): DraftPosition {
  return {
    roles,
    pool,
    captains: { red: pool[0]!.player.steamId, blu: pool[1]!.player.steamId },
    picks: [],
  }
}

// Independent, exhaustive oracle for small graphs: enumerate seats, never use
// the production augmenting-path matcher to calculate the expected answer.
function completions(roles: CaptainRole[], pool: PoolPlayer[]) {
  const slots = roleSlots(roles)
  const results: { team: Tf2Team; role: string; player: SteamId64 }[][] = []
  function visit(seats: (typeof results)[number]) {
    if (seats.length === slots.length) {
      results.push(seats)
      return
    }
    const slot = slots[seats.length]!
    for (const candidate of pool) {
      if (
        candidate.roles.includes(slot.role) &&
        !seats.some(seat => seat.player === candidate.player.steamId)
      ) {
        visit([...seats, { ...slot, player: candidate.player.steamId }])
      }
    }
  }
  visit([])
  return results
}

function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

describe('captain pool matching', () => {
  it('keeps the two pocket roles distinct', () => {
    expect(roleKey(sixRoles[0]!)).toBe('scout:pocket')
    expect(roleKey(sixRoles[2]!)).toBe('soldier:pocket')
  })

  it('leaves the medic uncovered in an oversized 13-player pool', () => {
    const keys = sixRoles.map(roleKey)
    const pool = Array.from({ length: 12 }, (_, id) => member(id, keys.slice(0, -1), id < 2))
    pool.push(member(12, [keys[5]!]))
    expect(poolReadiness(sixRoles, pool)).toMatchObject({
      full: false,
      players: 13,
      requiredPlayers: 12,
      coveredRoles: 5,
      volunteers: 2,
    })
  })

  it('requires volunteers who can actually be seated', () => {
    const pool = Array.from({ length: 5 }, (_, id) => member(id, smallKeys))
    expect(poolReadiness(smallRoles, pool).full).toBe(false)
    pool.push(member(5, [], true), member(6, [], true))
    expect(poolReadiness(smallRoles, pool).full).toBe(false)
    expect(eligibleCaptainPairs(smallRoles, pool)).toEqual([])
    pool[0]!.volunteer = true
    pool[1]!.volunteer = true
    expect(poolReadiness(smallRoles, pool).full).toBe(true)
    expect(eligibleCaptainPairs(smallRoles, pool)).toEqual([
      [pool[0]!.player.steamId, pool[1]!.player.steamId],
    ])
  })

  it('reassigns flexible players to seat restricted players', () => {
    const pool = [
      member(0, smallKeys, true),
      member(1, [smallKeys[0]!], true),
      member(2, [smallKeys[0]!]),
      member(3, [smallKeys[1]!]),
    ]
    expect(poolReadiness(smallRoles, pool)).toMatchObject({ full: true, coveredRoles: 2 })
    expect(eligibleCaptainPairs(smallRoles, pool)).toHaveLength(1)
  })

  it('keeps required captains seated even when the pool has extra players', () => {
    const pool = Array.from({ length: 8 }, (_, id) => member(id, smallKeys, true))
    const matching = matchRoleSlots(roleSlots(smallRoles), pool, [
      { player: pool[6]!.player.steamId, team: Tf2Team.red },
      { player: pool[7]!.player.steamId, team: Tf2Team.blu },
    ])!
    expect(matching).toContainEqual(
      expect.objectContaining({ player: pool[6]!.player.steamId, team: 'red' }),
    )
    expect(matching).toContainEqual(
      expect.objectContaining({ player: pool[7]!.player.steamId, team: 'blu' }),
    )
    expect(new Set(matching.map(seat => seat.player)).size).toBe(4)
  })

  it('does not seat two volunteers into the same remaining slot', () => {
    const pool = [member(0, [smallKeys[0]!], true), member(1, [smallKeys[0]!], true)]
    const slots = [{ team: Tf2Team.red, role: smallKeys[0]! }]
    expect(
      matchRoleSlots(
        slots,
        pool,
        pool.map(entry => ({
          player: entry.player.steamId,
          team: Tf2Team.red,
        })),
      ),
    ).toBeNull()
  })

  it('reports empty pools and never declares an empty config full', () => {
    expect(poolReadiness(smallRoles, [])).toMatchObject({
      full: false,
      coveredRoles: 0,
    })
    expect(poolReadiness([], []).full).toBe(false)
  })

  it('agrees with exhaustive seating for readiness, pairs and every first pick', () => {
    const random = seededRandom(73)
    for (let run = 0; run < 200; run++) {
      const pool = Array.from({ length: 4 + (run % 2) }, (_, id) =>
        member(
          id,
          smallKeys.filter(() => random() < 0.6),
          random() < 0.6,
        ),
      )
      const all = completions(smallRoles, pool)
      const volunteers = new Set(pool.filter(p => p.volunteer).map(p => p.player.steamId))
      expect(poolReadiness(smallRoles, pool).full).toBe(
        all.some(seats => seats.filter(seat => volunteers.has(seat.player)).length >= 2),
      )
      const expectedPairs: [SteamId64, SteamId64][] = []
      for (let first = 0; first < pool.length; first++) {
        for (let second = first + 1; second < pool.length; second++) {
          const red = pool[first]!.player.steamId
          const blu = pool[second]!.player.steamId
          if (
            volunteers.has(red) &&
            volunteers.has(blu) &&
            all.some(
              seats =>
                seats.some(s => s.player === red && s.team === Tf2Team.red) &&
                seats.some(s => s.player === blu && s.team === Tf2Team.blu),
            )
          )
            expectedPairs.push([red, blu])
        }
      }
      expect(eligibleCaptainPairs(smallRoles, pool)).toEqual(expectedPairs)
      const chosen = chooseCaptainPair(smallRoles, pool, random)
      if (expectedPairs.length) expect(expectedPairs).toContainEqual(chosen)
      else expect(chosen).toBeNull()
      const draft = position(pool)
      const compatible = all.filter(
        seats =>
          seats.some(s => s.player === draft.captains.red && s.team === Tf2Team.red) &&
          seats.some(s => s.player === draft.captains.blu && s.team === Tf2Team.blu),
      )
      const expectedPicks = pool.slice(2).flatMap(p =>
        smallKeys.flatMap(role => {
          const pick = { team: Tf2Team.red, player: p.player.steamId, role }
          return compatible.some(seats =>
            seats.some(s => s.player === pick.player && s.role === role && s.team === pick.team),
          )
            ? [pick]
            : []
        }),
      )
      expect(legalPicks(draft)).toEqual(expectedPicks)
      for (const first of expectedPicks) {
        const after = { ...draft, picks: [first] }
        const remaining = compatible.filter(seats =>
          seats.some(
            seat =>
              seat.player === first.player && seat.team === first.team && seat.role === first.role,
          ),
        )
        const expectedSecond = pool.slice(2).flatMap(p =>
          smallKeys.flatMap(role => {
            if (p.player.steamId === first.player) return []
            const pick = { team: Tf2Team.blu, player: p.player.steamId, role }
            return remaining.some(seats =>
              seats.some(
                seat =>
                  seat.player === pick.player && seat.team === pick.team && seat.role === pick.role,
              ),
            )
              ? [pick]
              : []
          }),
        )
        expect(legalPicks(after)).toEqual(expectedSecond)
      }
    }
  })
})

describe('captain draft helpers', () => {
  it.each([
    [6, 'RBBRRBBRRB', [[1], [2, 3], [4, 5], [6, 7], [8, 9], [10]]],
    [
      9,
      'RBBRRBBRRBBRRBBR',
      [[1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16]],
    ],
  ])('uses snake turns and one timer per double pick for %i roles', (count, order, picks) => {
    const turns = draftTurns(count)
    expect(turns.map(t => t.picks)).toEqual(picks)
    expect(
      turns.flatMap(t => t.picks.map(() => (t.team === Tf2Team.red ? 'R' : 'B'))).join(''),
    ).toBe(order)
  })

  it('derives the order for other role counts and rejects invalid counts', () => {
    expect(draftTurns(1)).toEqual([])
    expect(draftTurns(2)).toEqual([
      { team: 'red', picks: [1] },
      { team: 'blu', picks: [2] },
    ])
    for (const count of [0, -1, 1.5, NaN, Infinity])
      expect(() => draftTurns(count)).toThrow(RangeError)
  })

  it('pins captains to their teams and forbids a pick that would strand one', () => {
    const pool = [
      member(0, [smallKeys[0]!], true),
      member(1, [smallKeys[1]!], true),
      member(2, smallKeys),
      member(3, smallKeys),
    ]
    const draft = position(pool)
    expect(legalPicks(draft)).toEqual(
      pool.slice(2).map(p => ({
        team: Tf2Team.red,
        player: p.player.steamId,
        role: smallKeys[1],
      })),
    )
    expect(
      isDraftCompletable({
        ...draft,
        picks: [
          {
            team: Tf2Team.red,
            player: pool[2]!.player.steamId,
            role: smallKeys[0]!,
          },
        ],
      }),
    ).toBe(false)
    expect(finalCaptainRoles(draft)).toBeNull()
  })

  it('rejects repeated players, filled or unknown roles, captains and out-of-order teams', () => {
    const pool = Array.from({ length: 12 }, (_, id) => member(id, sixRoles.map(roleKey), true))
    const draft = position(pool, sixRoles)
    const first = legalPicks(draft)[0]!
    const second = { ...first, team: Tf2Team.blu }
    const bad = [
      [{ ...first, player: draft.captains.red }],
      [{ ...first, player: member(99, []).player.steamId }],
      [{ ...first, role: 'missing' }],
      [{ ...first, team: Tf2Team.blu }],
      [first, second],
      [
        first,
        { ...second, player: pool[3]!.player.steamId },
        { ...second, player: pool[4]!.player.steamId },
      ],
    ]
    for (const picks of bad) {
      expect(isDraftCompletable({ ...draft, picks })).toBe(false)
      expect(legalPicks({ ...draft, picks })).toEqual([])
    }
    expect(
      isDraftCompletable({
        ...draft,
        captains: { red: draft.captains.red, blu: draft.captains.red },
      }),
    ).toBe(false)
  })

  it('times out to the earliest joinedAt, using role order rather than signup role order', () => {
    const pool = [
      member(0, smallKeys, true),
      member(1, smallKeys, true),
      member(20, [...smallKeys].reverse()),
      member(10, [...smallKeys].reverse()),
      member(30, smallKeys),
    ]
    const draft = position(pool)
    const original = structuredClone(draft)
    expect(timeoutPick(draft)).toEqual({
      team: Tf2Team.red,
      player: pool[3]!.player.steamId,
      role: smallKeys[0],
    })
    expect(draft).toEqual(original)
  })

  it('exposes a single forced option and the captains final roles', () => {
    const pool = [
      member(0, [smallKeys[0]!], true),
      member(1, [smallKeys[1]!], true),
      member(2, [smallKeys[1]!]),
      member(3, [smallKeys[0]!]),
    ]
    let draft = position(pool)
    expect(legalPicks(draft)).toHaveLength(1)
    for (let count = 0; count < 2; count++)
      draft = { ...draft, picks: [...draft.picks, timeoutPick(draft)!] }
    expect(finalCaptainRoles(draft)).toEqual([
      { team: 'red', player: pool[0]!.player.steamId, role: smallKeys[0] },
      { team: 'blu', player: pool[1]!.player.steamId, role: smallKeys[1] },
    ])
    expect(legalPicks(draft)).toEqual([])
    expect(timeoutPick(draft)).toBeNull()
  })

  it.each([
    ['6v6', sixRoles],
    ['9v9', nineRoles],
  ])(
    'completes 200 seeded %s pools without duplicate seats or dead ends',
    (_mode, roles) => {
      const random = seededRandom(304)
      const keys = roles.map(roleKey)
      for (let run = 0; run < 200; run++) {
        // Guaranteed complete but randomly constrained pools, including surplus
        // members, singleton-role specialists, flexible players and volunteers.
        const pool = Array.from({ length: keys.length * 2 + (run % 9) }, (_, id) =>
          member(
            id,
            keys.filter((_, index) => index === id % keys.length || random() < 0.25),
            id < keys.length * 2 ? random() < 0.6 || id < 2 : random() < 0.5,
          ),
        )
        const pairs = eligibleCaptainPairs(roles, pool)
        expect(pairs.length).toBeGreaterThan(0)
        const pair = chooseCaptainPair(roles, pool, random)!
        expect(pairs).toContainEqual(pair)
        const captains =
          random() < 0.5 ? { red: pair[0], blu: pair[1] } : { red: pair[1], blu: pair[0] }
        let draft: DraftPosition = { roles, pool, captains, picks: [] }
        while (draft.picks.length < keys.length * 2 - 2) {
          const choices = legalPicks(draft)
          expect(choices.length).toBeGreaterThan(0)
          const pick =
            run % 2 ? timeoutPick(draft)! : choices[Math.floor(random() * choices.length)]!
          draft = { ...draft, picks: [...draft.picks, pick] }
        }
        const seats = [...draft.picks, ...finalCaptainRoles(draft)!]
        expect(new Set(seats.map(s => s.player)).size).toBe(keys.length * 2)
        for (const team of [Tf2Team.red, Tf2Team.blu]) {
          expect(
            seats
              .filter(s => s.team === team)
              .map(s => s.role)
              .sort(),
          ).toEqual([...keys].sort())
          expect(seats.find(s => s.player === captains[team])!.team).toBe(team)
        }
        for (const seat of seats)
          expect(pool.find(p => p.player.steamId === seat.player)!.roles).toContain(seat.role)
      }
    },
    secondsToMilliseconds(30),
  )

  it(
    'keeps a 40-player 9v9 draw, legal-pick set and single-pick validation within budget',
    () => {
      const roles = nineRoles
      const keys = roles.map(roleKey)
      const pool = Array.from({ length: 40 }, (_, id) => member(id, keys, true))
      const draft = position(pool, roles)
      const random = seededRandom(997)
      const pick = { team: Tf2Team.red, player: pool[2]!.player.steamId, role: keys[0]! }
      const submitted = { ...draft, picks: [pick] }
      const operations = [
        { name: 'captain draw', run: () => chooseCaptainPair(roles, pool, random), budget: 50 },
        { name: 'legal-pick set', run: () => legalPicks(draft), budget: 50 },
        { name: 'single-pick validation', run: () => isDraftCompletable(submitted), budget: 5 },
      ]
      for (const { name, run, budget } of operations) {
        for (let warmup = 0; warmup < 10; warmup++) run()
        const times = Array.from({ length: 100 }, () => {
          const start = performance.now()
          run()
          return performance.now() - start
        }).sort((a, b) => a - b)
        expect(times[95], `${name} p95 in milliseconds`).toBeLessThan(budget)
      }
    },
    secondsToMilliseconds(30),
  )

  it.each([
    ['6v6', sixRoles],
    ['9v9', nineRoles],
  ])('matches a 40-player %s pool in under 5ms (p95)', (_mode, roles) => {
    const random = seededRandom(19)
    const keys = roles.map(roleKey)
    const pools = Array.from({ length: 100 }, () =>
      Array.from({ length: 40 }, (_, id) =>
        member(
          id,
          keys.filter(() => random() < 0.5),
          id < 10,
        ),
      ),
    )
    for (const pool of pools) poolReadiness(roles, pool)
    const times = pools
      .map(pool => {
        const start = performance.now()
        poolReadiness(roles, pool)
        return performance.now() - start
      })
      .sort((a, b) => a - b)
    expect(times[95]).toBeLessThan(5)
  })
})
