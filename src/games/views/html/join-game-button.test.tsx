import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { JoinGameButton } from './join-game-button'
import { GameState } from '../../../database/models/game.model'
import type { GameNumber } from '../../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../../database/models/game-slot.model'
import type { GameSlotId } from '../../../shared/types/game-slot-id'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

const actor = '76561198000000001' as SteamId64

const activeSlot = {
  id: 'red-soldier-0' as GameSlotId,
  player: actor,
  team: Tf2Team.red,
  gameClass: Tf2ClassName.soldier,
  status: SlotStatus.active,
  connectionStatus: PlayerConnectionStatus.connected,
}

const baseGame = {
  number: 1 as GameNumber,
  state: GameState.launching,
  slots: [activeSlot],
  connectString: 'connect 192.168.1.1:27015; password abc',
  stvConnectString: 'connect 192.168.1.1:27020',
}

describe('JoinGameButton', () => {
  describe('when game is not yet ready (created/configuring)', () => {
    it('shows a waiting loader for created state', async () => {
      const html = await JoinGameButton({ game: { ...baseGame, state: GameState.created }, actor })
      const root = parse(html)
      expect(root.querySelector('.sr-only')?.text).toBe('Waiting for server...')
    })

    it('shows a waiting loader for configuring state', async () => {
      const html = await JoinGameButton({
        game: { ...baseGame, state: GameState.configuring },
        actor,
      })
      const root = parse(html)
      expect(root.querySelector('.sr-only')?.text).toBe('Waiting for server...')
    })
  })

  describe('when game is ready', () => {
    it('links to the game connect string when actor has a slot', async () => {
      const html = await JoinGameButton({ game: baseGame, actor })
      const root = parse(html)
      const link = root.querySelector('.join-game-button')
      expect(link?.getAttribute('href')).toBe('steam://connect/192.168.1.1:27015/abc')
    })

    it('links to the stv connect string when there is no actor', async () => {
      const html = await JoinGameButton({ game: baseGame, actor: undefined })
      const root = parse(html)
      const link = root.querySelector('.join-game-button')
      expect(link?.getAttribute('href')).toBe('steam://connect/192.168.1.1:27020')
    })

    it('links to the stv connect string when actor has no slot', async () => {
      const game = { ...baseGame, slots: [] }
      const html = await JoinGameButton({ game, actor })
      const root = parse(html)
      const link = root.querySelector('.join-game-button')
      expect(link?.getAttribute('href')).toBe('steam://connect/192.168.1.1:27020')
    })

    it('links to the game connect string when actor slot is waitingForSubstitute', async () => {
      const waitingSlot = { ...activeSlot, status: SlotStatus.waitingForSubstitute }
      const game = { ...baseGame, slots: [waitingSlot] }
      const html = await JoinGameButton({ game, actor })
      const root = parse(html)
      const link = root.querySelector('.join-game-button')
      expect(link?.getAttribute('href')).toBe('steam://connect/192.168.1.1:27015/abc')
    })

    it('renders plain join game button (no countdown) when actor slot is offline with no shouldJoinBy', async () => {
      const offlineSlot = {
        ...activeSlot,
        connectionStatus: PlayerConnectionStatus.offline,
      }
      const game = { ...baseGame, slots: [offlineSlot] }
      const html = await JoinGameButton({ game, actor })
      const root = parse(html)
      expect(root.querySelector('[data-countdown]')).toBeNull()
    })

    describe('when actor slot is offline with a shouldJoinBy deadline', () => {
      beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('renders a countdown element with the remaining ms', async () => {
        const shouldJoinBy = new Date('2026-01-01T12:01:30.000Z') // 90 seconds from now
        const offlineSlot = {
          ...activeSlot,
          connectionStatus: PlayerConnectionStatus.offline,
          shouldJoinBy,
        }
        const game = { ...baseGame, slots: [offlineSlot] }
        const html = await JoinGameButton({ game, actor })
        const root = parse(html)
        const countdown = root.querySelector('[data-countdown]')
        expect(countdown).not.toBeNull()
        expect(countdown!.getAttribute('data-countdown')).toBe(shouldJoinBy.getTime().toString())
      })

      it('renders plain join game button (no countdown) when shouldJoinBy is in the past', async () => {
        const shouldJoinBy = new Date('2025-12-31T11:58:30.000Z') // 1.5 minutes before system time
        const offlineSlot = {
          ...activeSlot,
          connectionStatus: PlayerConnectionStatus.offline,
          shouldJoinBy,
        }
        const game = { ...baseGame, slots: [offlineSlot] }
        const html = await JoinGameButton({ game, actor })
        const root = parse(html)
        expect(root.querySelector('[data-countdown]')).toBeNull()
      })
    })
  })
})
