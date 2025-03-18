import { describe, expect, it } from 'vitest'
import { pickTeams, type PlayerSlot, type TeamOverrides } from './pick-teams'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2ClassName } from '../shared/types/tf2-class-name'

function randomSteamId() {
  const chars = '0123456789'
  const length = 17
  let result = ''
  for (let i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result as SteamId64
}

describe('pickTeams', () => {
  describe('for 2v2', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a, b, c, d] = Array.from(Array(4)).map(_ => randomSteamId()) as [
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
    ]

    const players: PlayerSlot[] = [
      { player: a, gameClass: Tf2ClassName.soldier, skill: 1 },
      { player: b, gameClass: Tf2ClassName.soldier, skill: 2 },
      { player: c, gameClass: Tf2ClassName.soldier, skill: 3 },
      { player: d, gameClass: Tf2ClassName.soldier, skill: 4 },
    ]

    it('should pick teams', () => {
      expect(pickTeams(players)).toEqual([
        {
          player: a,
          gameClass: Tf2ClassName.soldier,
          skill: 1,
          team: 'blu',
          id: 'blu-soldier-1',
        },
        {
          player: d,
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'blu',
          id: 'blu-soldier-2',
        },
        {
          player: b,
          gameClass: Tf2ClassName.soldier,
          skill: 2,
          team: 'red',
          id: 'red-soldier-1',
        },
        {
          player: c,
          gameClass: Tf2ClassName.soldier,
          skill: 3,
          team: 'red',
          id: 'red-soldier-2',
        },
      ])
    })

    describe('with friends', () => {
      describe('having all the friends valid', () => {
        const overrides: TeamOverrides = {
          friends: [
            [a, c], // 'a' and 'c' will be in the same team
          ],
        }

        it('should pick teams', () => {
          expect(pickTeams(players, overrides)).toEqual([
            {
              player: a,
              gameClass: Tf2ClassName.soldier,
              skill: 1,
              team: 'blu',
              id: 'blu-soldier-1',
            },
            {
              player: c,
              gameClass: Tf2ClassName.soldier,
              skill: 3,
              team: 'blu',
              id: 'blu-soldier-2',
            },
            {
              player: b,
              gameClass: Tf2ClassName.soldier,
              skill: 2,
              team: 'red',
              id: 'red-soldier-1',
            },
            {
              player: d,
              gameClass: Tf2ClassName.soldier,
              skill: 4,
              team: 'red',
              id: 'red-soldier-2',
            },
          ])
        })
      })

      describe('missing one friend', () => {
        const overrides: TeamOverrides = {
          friends: [[a, randomSteamId()]],
        }

        it('should pick teams', () => {
          expect(pickTeams(players, overrides)).toEqual([
            {
              player: a,
              gameClass: Tf2ClassName.soldier,
              skill: 1,
              team: 'blu',
              id: 'blu-soldier-1',
            },
            {
              player: d,
              gameClass: Tf2ClassName.soldier,
              skill: 4,
              team: 'blu',
              id: 'blu-soldier-2',
            },
            {
              player: b,
              gameClass: Tf2ClassName.soldier,
              skill: 2,
              team: 'red',
              id: 'red-soldier-1',
            },
            {
              player: c,
              gameClass: Tf2ClassName.soldier,
              skill: 3,
              team: 'red',
              id: 'red-soldier-2',
            },
          ])
        })
      })
    })
  })

  describe('for 6v6', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a, b, c, d, e, f, g, h, i, j, k, l] = Array.from(Array(12)).map(_ =>
      randomSteamId(),
    ) as [
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
    ]

    const players: PlayerSlot[] = [
      { player: a, gameClass: Tf2ClassName.scout, skill: 3 },
      { player: b, gameClass: Tf2ClassName.scout, skill: 2 },
      { player: c, gameClass: Tf2ClassName.scout, skill: 2 },
      { player: d, gameClass: Tf2ClassName.scout, skill: 2 },
      { player: e, gameClass: Tf2ClassName.soldier, skill: 4 },
      { player: f, gameClass: Tf2ClassName.soldier, skill: 4 },
      { player: g, gameClass: Tf2ClassName.soldier, skill: 5 },
      { player: h, gameClass: Tf2ClassName.soldier, skill: 4 },
      { player: i, gameClass: Tf2ClassName.demoman, skill: 1 },
      { player: j, gameClass: Tf2ClassName.demoman, skill: 3 },
      { player: k, gameClass: Tf2ClassName.medic, skill: 2 },
      { player: l, gameClass: Tf2ClassName.medic, skill: 4 },
    ]

    it('should pick teams', () => {
      expect(pickTeams(players)).toEqual([
        { player: a, gameClass: Tf2ClassName.scout, skill: 3, team: 'blu', id: 'blu-scout-1' },
        { player: b, gameClass: Tf2ClassName.scout, skill: 2, team: 'blu', id: 'blu-scout-2' },
        {
          player: e,
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'blu',
          id: 'blu-soldier-1',
        },
        {
          player: f,
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'blu',
          id: 'blu-soldier-2',
        },
        {
          player: i,
          gameClass: Tf2ClassName.demoman,
          skill: 1,
          team: 'blu',
          id: 'blu-demoman-1',
        },
        { player: l, gameClass: Tf2ClassName.medic, skill: 4, team: 'blu', id: 'blu-medic-1' },
        { player: c, gameClass: Tf2ClassName.scout, skill: 2, team: 'red', id: 'red-scout-1' },
        { player: d, gameClass: Tf2ClassName.scout, skill: 2, team: 'red', id: 'red-scout-2' },
        {
          player: g,
          gameClass: Tf2ClassName.soldier,
          skill: 5,
          team: 'red',
          id: 'red-soldier-1',
        },
        {
          player: h,
          gameClass: Tf2ClassName.soldier,
          skill: 4,
          team: 'red',
          id: 'red-soldier-2',
        },
        {
          player: j,
          gameClass: Tf2ClassName.demoman,
          skill: 3,
          team: 'red',
          id: 'red-demoman-1',
        },
        { player: k, gameClass: Tf2ClassName.medic, skill: 2, team: 'red', id: 'red-medic-1' },
      ])
    })

    describe('with friends', () => {
      const overrides: TeamOverrides = {
        friends: [
          [k, i],
          [l, g],
        ],
      }

      it('should pick teams', () => {
        expect(pickTeams(players, overrides)).toEqual([
          {
            player: a,
            gameClass: Tf2ClassName.scout,
            skill: 3,
            team: 'blu',
            id: 'blu-scout-1',
          },
          {
            player: b,
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'blu',
            id: 'blu-scout-2',
          },
          {
            player: e,
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'blu',
            id: 'blu-soldier-1',
          },
          {
            player: f,
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'blu',
            id: 'blu-soldier-2',
          },
          {
            player: i,
            gameClass: Tf2ClassName.demoman,
            skill: 1,
            team: 'blu',
            id: 'blu-demoman-1',
          },
          {
            player: k,
            gameClass: Tf2ClassName.medic,
            skill: 2,
            team: 'blu',
            id: 'blu-medic-1',
          },

          {
            player: c,
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'red',
            id: 'red-scout-1',
          },
          {
            player: d,
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'red',
            id: 'red-scout-2',
          },
          {
            player: g,
            gameClass: Tf2ClassName.soldier,
            skill: 5,
            team: 'red',
            id: 'red-soldier-1',
          },
          {
            player: h,
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'red',
            id: 'red-soldier-2',
          },
          {
            player: j,
            gameClass: Tf2ClassName.demoman,
            skill: 3,
            team: 'red',
            id: 'red-demoman-1',
          },
          {
            player: l,
            gameClass: Tf2ClassName.medic,
            skill: 4,
            team: 'red',
            id: 'red-medic-1',
          },
        ])
      })
    })

    describe('issue 456', () => {
      const [
        zinner,
        mielzky,
        mejf,
        wonder,
        stan,
        cieniu97,
        bobair,
        kwq,
        antro15cm,
        graba,
        crzje,
        loww,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ] = Array.from(Array(12)).map(_ => randomSteamId()) as [
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
        SteamId64,
      ]

      const players: PlayerSlot[] = [
        { player: zinner, gameClass: Tf2ClassName.soldier, skill: 4 },
        { player: mielzky, gameClass: Tf2ClassName.soldier, skill: 2 },
        { player: mejf, gameClass: Tf2ClassName.demoman, skill: 3 },
        { player: wonder, gameClass: Tf2ClassName.soldier, skill: 3 },
        { player: stan, gameClass: Tf2ClassName.medic, skill: 4 },
        { player: cieniu97, gameClass: Tf2ClassName.demoman, skill: 2 },
        { player: bobair, gameClass: Tf2ClassName.medic, skill: 1 },
        { player: kwq, gameClass: Tf2ClassName.scout, skill: 7 },
        { player: antro15cm, gameClass: Tf2ClassName.scout, skill: 2 },
        { player: graba, gameClass: Tf2ClassName.scout, skill: 4 },
        { player: crzje, gameClass: Tf2ClassName.scout, skill: 4 },
        { player: loww, gameClass: Tf2ClassName.soldier, skill: 3 },
      ]

      const overrides: TeamOverrides = {
        friends: [
          [bobair, kwq],
          [stan, zinner],
        ],
      }

      it('should pick teams', () => {
        expect(pickTeams(players, overrides)).toEqual([
          {
            player: zinner,
            gameClass: Tf2ClassName.soldier,
            skill: 4,
            team: 'blu',
            id: 'blu-soldier-1',
          },
          {
            player: mielzky,
            gameClass: Tf2ClassName.soldier,
            skill: 2,
            team: 'blu',
            id: 'blu-soldier-2',
          },
          {
            player: cieniu97,
            gameClass: Tf2ClassName.demoman,
            skill: 2,
            team: 'blu',
            id: 'blu-demoman-1',
          },
          {
            player: stan,
            gameClass: Tf2ClassName.medic,
            skill: 4,
            team: 'blu',
            id: 'blu-medic-1',
          },
          {
            player: graba,
            gameClass: Tf2ClassName.scout,
            skill: 4,
            team: 'blu',
            id: 'blu-scout-1',
          },
          {
            player: crzje,
            gameClass: Tf2ClassName.scout,
            skill: 4,
            team: 'blu',
            id: 'blu-scout-2',
          },

          {
            player: wonder,
            gameClass: Tf2ClassName.soldier,
            skill: 3,
            team: 'red',
            id: 'red-soldier-1',
          },
          {
            player: loww,
            gameClass: Tf2ClassName.soldier,
            skill: 3,
            team: 'red',
            id: 'red-soldier-2',
          },
          {
            player: mejf,
            gameClass: Tf2ClassName.demoman,
            skill: 3,
            team: 'red',
            id: 'red-demoman-1',
          },
          {
            player: bobair,
            gameClass: Tf2ClassName.medic,
            skill: 1,
            team: 'red',
            id: 'red-medic-1',
          },
          {
            player: kwq,
            gameClass: Tf2ClassName.scout,
            skill: 7,
            team: 'red',
            id: 'red-scout-1',
          },
          {
            player: antro15cm,
            gameClass: Tf2ClassName.scout,
            skill: 2,
            team: 'red',
            id: 'red-scout-2',
          },
        ])
      })
    })
  })

  describe('for 9v9', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r] = Array.from(Array(18)).map(_ =>
      randomSteamId(),
    ) as [
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
    ]

    const players: PlayerSlot[] = [
      { player: a, gameClass: Tf2ClassName.scout, skill: 1 },
      { player: b, gameClass: Tf2ClassName.scout, skill: 9 },
      { player: c, gameClass: Tf2ClassName.soldier, skill: 2 },
      { player: d, gameClass: Tf2ClassName.soldier, skill: 8 },
      { player: e, gameClass: Tf2ClassName.pyro, skill: 3 },
      { player: f, gameClass: Tf2ClassName.pyro, skill: 7 },
      { player: g, gameClass: Tf2ClassName.demoman, skill: 4 },
      { player: h, gameClass: Tf2ClassName.demoman, skill: 6 },
      { player: i, gameClass: Tf2ClassName.heavy, skill: 5 },
      { player: j, gameClass: Tf2ClassName.heavy, skill: 5 },
      { player: k, gameClass: Tf2ClassName.engineer, skill: 6 },
      { player: l, gameClass: Tf2ClassName.engineer, skill: 4 },
      { player: m, gameClass: Tf2ClassName.medic, skill: 7 },
      { player: n, gameClass: Tf2ClassName.medic, skill: 3 },
      { player: o, gameClass: Tf2ClassName.sniper, skill: 8 },
      { player: p, gameClass: Tf2ClassName.sniper, skill: 2 },
      { player: q, gameClass: Tf2ClassName.spy, skill: 9 },
      { player: r, gameClass: Tf2ClassName.spy, skill: 1 },
    ]

    it('should pick teams', () => {
      expect(pickTeams(players)).toEqual([
        { player: a, gameClass: Tf2ClassName.scout, skill: 1, team: 'blu', id: 'blu-scout-1' },
        {
          player: c,
          gameClass: Tf2ClassName.soldier,
          skill: 2,
          team: 'blu',
          id: 'blu-soldier-1',
        },
        { player: e, gameClass: Tf2ClassName.pyro, skill: 3, team: 'blu', id: 'blu-pyro-1' },
        {
          player: g,
          gameClass: Tf2ClassName.demoman,
          skill: 4,
          team: 'blu',
          id: 'blu-demoman-1',
        },
        { player: i, gameClass: Tf2ClassName.heavy, skill: 5, team: 'blu', id: 'blu-heavy-1' },
        {
          player: k,
          gameClass: Tf2ClassName.engineer,
          skill: 6,
          team: 'blu',
          id: 'blu-engineer-1',
        },
        { player: m, gameClass: Tf2ClassName.medic, skill: 7, team: 'blu', id: 'blu-medic-1' },
        {
          player: o,
          gameClass: Tf2ClassName.sniper,
          skill: 8,
          team: 'blu',
          id: 'blu-sniper-1',
        },
        { player: q, gameClass: Tf2ClassName.spy, skill: 9, team: 'blu', id: 'blu-spy-1' },
        { player: b, gameClass: Tf2ClassName.scout, skill: 9, team: 'red', id: 'red-scout-1' },
        {
          player: d,
          gameClass: Tf2ClassName.soldier,
          skill: 8,
          team: 'red',
          id: 'red-soldier-1',
        },
        { player: f, gameClass: Tf2ClassName.pyro, skill: 7, team: 'red', id: 'red-pyro-1' },
        {
          player: h,
          gameClass: Tf2ClassName.demoman,
          skill: 6,
          team: 'red',
          id: 'red-demoman-1',
        },
        { player: j, gameClass: Tf2ClassName.heavy, skill: 5, team: 'red', id: 'red-heavy-1' },
        {
          player: l,
          gameClass: Tf2ClassName.engineer,
          skill: 4,
          team: 'red',
          id: 'red-engineer-1',
        },
        { player: n, gameClass: Tf2ClassName.medic, skill: 3, team: 'red', id: 'red-medic-1' },
        {
          player: p,
          gameClass: Tf2ClassName.sniper,
          skill: 2,
          team: 'red',
          id: 'red-sniper-1',
        },
        { player: r, gameClass: Tf2ClassName.spy, skill: 1, team: 'red', id: 'red-spy-1' },
      ])
    })
  })

  it('should throw an error if trying to make teams of 3 players the same class', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a, b, c, d, e, f] = Array.from(Array(6)).map(_ => randomSteamId()) as [
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
      SteamId64,
    ]

    const players: PlayerSlot[] = [
      { player: a, gameClass: Tf2ClassName.soldier, skill: 1 },
      { player: b, gameClass: Tf2ClassName.soldier, skill: 2 },
      { player: c, gameClass: Tf2ClassName.soldier, skill: 3 },
      { player: d, gameClass: Tf2ClassName.soldier, skill: 4 },
      { player: e, gameClass: Tf2ClassName.soldier, skill: 5 },
      { player: f, gameClass: Tf2ClassName.soldier, skill: 6 },
    ]

    expect(() => pickTeams(players)).toThrow()
  })

  it('should throw an error if player count is not even', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [a, b, c] = Array.from(Array(3)).map(_ => randomSteamId()) as [
      SteamId64,
      SteamId64,
      SteamId64,
    ]

    const players: PlayerSlot[] = [
      { player: a, gameClass: Tf2ClassName.soldier, skill: 1 },
      { player: b, gameClass: Tf2ClassName.soldier, skill: 2 },
      { player: c, gameClass: Tf2ClassName.soldier, skill: 3 },
    ]

    expect(() => pickTeams(players)).toThrow()
  })
})
