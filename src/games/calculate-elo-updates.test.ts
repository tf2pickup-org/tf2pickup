import { describe, expect, it } from 'vitest'
import { calculateEloUpdates, defaultElo } from './calculate-elo-updates'
import {
  GameEndedReason,
  GameEventType,
  type GameCreated,
  type GameEnded,
  type GameStarted,
  type PlayerReplaced,
} from '../database/models/game-event.model'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { Tf2Team } from '../shared/types/tf2-team'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { GameSlotId } from '../shared/types/game-slot-id'

// Fixed timestamps: 60-minute game
const startedAt = new Date('2024-01-01T10:00:00Z')
const endedAt = new Date('2024-01-01T11:00:00Z')
const gameDurationMs = endedAt.getTime() - startedAt.getTime()

const createdEvent: GameCreated = {
  event: GameEventType.gameCreated,
  at: new Date('2024-01-01T09:55:00Z'),
}
const startedEvent: GameStarted = { event: GameEventType.gameStarted, at: startedAt }
const endedEvent: GameEnded = {
  event: GameEventType.gameEnded,
  at: endedAt,
  reason: GameEndedReason.matchEnded,
}

const red = '76561198000000001' as SteamId64
const blu = '76561198000000002' as SteamId64
const red2 = '76561198000000003' as SteamId64
const blu2 = '76561198000000004' as SteamId64

function makeSlot(
  player: SteamId64,
  team: Tf2Team,
  gameClass: Tf2ClassName,
  status = SlotStatus.active,
) {
  return {
    id: `${team}-${gameClass}-1` as GameSlotId,
    player,
    team,
    gameClass,
    status,
    connectionStatus: PlayerConnectionStatus.connected,
  }
}

function makeGame(
  overrides: Omit<Partial<GameModel>, 'score'> & { score?: Record<Tf2Team, number> },
): GameModel {
  return {
    number: 1 as GameNumber,
    map: 'cp_process_final',
    state: GameState.ended,
    slots: [
      makeSlot(red, Tf2Team.red, Tf2ClassName.scout),
      makeSlot(blu, Tf2Team.blu, Tf2ClassName.scout),
    ],
    events: [createdEvent, startedEvent, endedEvent],
    score: { red: 3, blu: 0 },
    ...overrides,
  }
}

// Getters that return defaultElo and 0 games for everyone
const getDefaultElo = () => defaultElo
const provisionalGames = () => 0
const establishedGames = () => 10

describe('calculateEloUpdates', () => {
  describe('guard conditions', () => {
    it('returns empty array when game state is not ended', () => {
      const game = makeGame({ state: GameState.started })
      expect(calculateEloUpdates(game, getDefaultElo, provisionalGames)).toEqual([])
    })

    it('returns empty array when game has no score', () => {
      const { score: _s, ...game } = makeGame({})
      expect(calculateEloUpdates(game as GameModel, getDefaultElo, provisionalGames)).toEqual([])
    })

    it('returns empty array when gameStarted event is missing', () => {
      const game = makeGame({ events: [createdEvent, endedEvent] })
      expect(calculateEloUpdates(game, getDefaultElo, provisionalGames)).toEqual([])
    })

    it('returns empty array when gameEnded event is missing', () => {
      const game = makeGame({ events: [createdEvent, startedEvent] })
      expect(calculateEloUpdates(game, getDefaultElo, provisionalGames)).toEqual([])
    })
  })

  describe('ELO calculation', () => {
    it('gives winner ELO gain and loser ELO loss when teams are equally matched', () => {
      // E = 0.5 for both; K = 32 (provisional)
      // winner: 1500 + 32 * (1 - 0.5) = 1516
      // loser:  1500 + 32 * (0 - 0.5) = 1484
      const game = makeGame({ score: { red: 3, blu: 0 } })
      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)

      expect(updates.find(u => u.steamId === red)?.newElo).toBe(1516)
      expect(updates.find(u => u.steamId === blu)?.newElo).toBe(1484)
    })

    it('results in no ELO change on a tie', () => {
      // S = 0.5, E = 0.5 → delta = 0
      const game = makeGame({ score: { red: 1, blu: 1 } })
      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)

      expect(updates.find(u => u.steamId === red)?.newElo).toBe(defaultElo)
      expect(updates.find(u => u.steamId === blu)?.newElo).toBe(defaultElo)
    })

    it('uses K=32 for provisional players (fewer than 10 games on class)', () => {
      const game = makeGame({ score: { red: 3, blu: 0 } })
      const updates = calculateEloUpdates(game, getDefaultElo, () => 9) // 9 games = still provisional
      expect(updates.find(u => u.steamId === red)?.newElo).toBe(1516) // K=32
    })

    it('uses K=16 for established players (10 or more games on class)', () => {
      // winner: 1500 + 16 * (1 - 0.5) = 1508
      // loser:  1500 + 16 * (0 - 0.5) = 1492
      const game = makeGame({ score: { red: 3, blu: 0 } })
      const updates = calculateEloUpdates(game, getDefaultElo, establishedGames)

      expect(updates.find(u => u.steamId === red)?.newElo).toBe(1508)
      expect(updates.find(u => u.steamId === blu)?.newElo).toBe(1492)
    })

    it('gives a smaller gain to the higher-rated winner', () => {
      // red at 1600, blu at 1400; red wins
      // E_red ≈ 0.7597 → gain ≈ round(32 * 0.2403) = 8 → 1608
      const customElo = (steamId: SteamId64) => (steamId === red ? 1600 : 1400)
      const game = makeGame({ score: { red: 3, blu: 0 } })
      const updates = calculateEloUpdates(game, customElo, provisionalGames)

      expect(updates.find(u => u.steamId === red)?.newElo).toBe(1608)
      expect(updates.find(u => u.steamId === blu)?.newElo).toBe(1392)
    })

    it('gives a larger gain to the lower-rated winner (upset)', () => {
      // red at 1400, blu at 1600; red wins
      // E_red ≈ 0.2403 → gain ≈ round(32 * 0.7597) = 24 → 1424
      const customElo = (steamId: SteamId64) => (steamId === red ? 1400 : 1600)
      const game = makeGame({ score: { red: 3, blu: 0 } })
      const updates = calculateEloUpdates(game, customElo, provisionalGames)

      expect(updates.find(u => u.steamId === red)?.newElo).toBe(1424)
      expect(updates.find(u => u.steamId === blu)?.newElo).toBe(1576)
    })

    it('attaches the correct game number and timestamp to each update', () => {
      const game = makeGame({ number: 42 as GameNumber })
      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)

      for (const update of updates) {
        expect(update.game).toBe(42)
        expect(update.at).toEqual(endedAt)
      }
    })
  })

  describe('play time eligibility (80% threshold)', () => {
    function atPercent(percent: number): Date {
      return new Date(startedAt.getTime() + gameDurationMs * percent)
    }

    it('includes a player who played the full game', () => {
      const game = makeGame({})
      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)
      expect(updates.some(u => u.steamId === red)).toBe(true)
    })

    it('includes an original player replaced after the 80% mark', () => {
      const replacedAt = atPercent(0.85) // 85% through
      const sub = red2

      const replacement: PlayerReplaced = {
        event: GameEventType.playerReplaced,
        at: replacedAt,
        replacee: red,
        replacement: sub,
        gameClass: Tf2ClassName.scout,
      }

      const game = makeGame({
        slots: [
          makeSlot(red, Tf2Team.red, Tf2ClassName.scout, SlotStatus.waitingForSubstitute),
          makeSlot(sub, Tf2Team.red, Tf2ClassName.scout),
          makeSlot(blu, Tf2Team.blu, Tf2ClassName.scout),
        ],
        events: [createdEvent, startedEvent, replacement, endedEvent],
      })

      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)
      // red played 85% → included; sub played 15% → excluded
      expect(updates.some(u => u.steamId === red)).toBe(true)
      expect(updates.some(u => u.steamId === sub)).toBe(false)
    })

    it('excludes an original player replaced before the 80% mark', () => {
      const replacedAt = atPercent(0.75) // 75% through
      const sub = red2

      const replacement: PlayerReplaced = {
        event: GameEventType.playerReplaced,
        at: replacedAt,
        replacee: red,
        replacement: sub,
        gameClass: Tf2ClassName.scout,
      }

      const game = makeGame({
        slots: [
          makeSlot(red, Tf2Team.red, Tf2ClassName.scout, SlotStatus.waitingForSubstitute),
          makeSlot(sub, Tf2Team.red, Tf2ClassName.scout),
          makeSlot(blu, Tf2Team.blu, Tf2ClassName.scout),
        ],
        events: [createdEvent, startedEvent, replacement, endedEvent],
      })

      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)
      // red played 75% → excluded; sub played 25% → excluded
      expect(updates.some(u => u.steamId === red)).toBe(false)
      expect(updates.some(u => u.steamId === sub)).toBe(false)
    })

    it('includes a substitute who joined early enough to exceed the 80% threshold', () => {
      const replacedAt = atPercent(0.1) // sub joins at 10% → plays 90%
      const sub = red2

      const replacement: PlayerReplaced = {
        event: GameEventType.playerReplaced,
        at: replacedAt,
        replacee: red,
        replacement: sub,
        gameClass: Tf2ClassName.scout,
      }

      const game = makeGame({
        slots: [
          makeSlot(red, Tf2Team.red, Tf2ClassName.scout, SlotStatus.waitingForSubstitute),
          makeSlot(sub, Tf2Team.red, Tf2ClassName.scout),
          makeSlot(blu, Tf2Team.blu, Tf2ClassName.scout),
        ],
        events: [createdEvent, startedEvent, replacement, endedEvent],
      })

      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)
      // sub played 90% → included
      expect(updates.some(u => u.steamId === sub)).toBe(true)
    })

    it('excludes a substitute who joined too late to reach the 80% threshold', () => {
      const replacedAt = atPercent(0.25) // sub joins at 25% → plays only 75%
      const sub = red2

      const replacement: PlayerReplaced = {
        event: GameEventType.playerReplaced,
        at: replacedAt,
        replacee: red,
        replacement: sub,
        gameClass: Tf2ClassName.scout,
      }

      const game = makeGame({
        slots: [
          makeSlot(red, Tf2Team.red, Tf2ClassName.scout, SlotStatus.waitingForSubstitute),
          makeSlot(sub, Tf2Team.red, Tf2ClassName.scout),
          makeSlot(blu, Tf2Team.blu, Tf2ClassName.scout),
        ],
        events: [createdEvent, startedEvent, replacement, endedEvent],
      })

      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)
      // sub played 75% → excluded
      expect(updates.some(u => u.steamId === sub)).toBe(false)
    })
  })

  describe('enemy ELO comparison', () => {
    it('compares against the same-class enemy when one exists', () => {
      // 1v1 scout mirror — both at 1500, red wins
      const game = makeGame({ score: { red: 3, blu: 0 } })
      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)
      expect(updates).toHaveLength(2)
      expect(updates.find(u => u.steamId === red)?.newElo).toBe(1516)
    })

    it('falls back to all eligible enemies when no same-class enemy exists', () => {
      // red plays scout, blu plays soldier (no mirror) — result should still be calculable
      const game = makeGame({
        slots: [
          makeSlot(red, Tf2Team.red, Tf2ClassName.scout),
          makeSlot(blu, Tf2Team.blu, Tf2ClassName.soldier),
        ],
        score: { red: 3, blu: 0 },
      })

      const updates = calculateEloUpdates(game, getDefaultElo, provisionalGames)
      // Both players have updates because comparison falls back to the only eligible enemy
      expect(updates.some(u => u.steamId === red)).toBe(true)
      expect(updates.some(u => u.steamId === blu)).toBe(true)
      // Equal ELO regardless of class → same result as a mirror match
      expect(updates.find(u => u.steamId === red)?.newElo).toBe(1516)
      expect(updates.find(u => u.steamId === blu)?.newElo).toBe(1484)
    })

    it('uses the average ELO across multiple same-class enemies', () => {
      // 2v2 scouts: red (1500) vs blu (1400) + blu2 (1600) → avg enemy = 1500
      // Equal averages → same result as a mirror 1v1 at 1500
      const customElo = (steamId: SteamId64) => {
        if (steamId === blu) return 1400
        if (steamId === blu2) return 1600
        return defaultElo
      }

      const game = makeGame({
        slots: [
          makeSlot(red, Tf2Team.red, Tf2ClassName.scout),
          makeSlot(blu, Tf2Team.blu, Tf2ClassName.scout),
          { ...makeSlot(blu2, Tf2Team.blu, Tf2ClassName.scout), id: 'blu-scout-2' as GameSlotId },
        ],
        score: { red: 3, blu: 0 },
      })

      const redUpdate = calculateEloUpdates(game, customElo, provisionalGames).find(
        u => u.steamId === red,
      )
      // avg enemy ELO = (1400 + 1600) / 2 = 1500 → E = 0.5 → gain = 16
      expect(redUpdate?.newElo).toBe(1516)
    })
  })
})
