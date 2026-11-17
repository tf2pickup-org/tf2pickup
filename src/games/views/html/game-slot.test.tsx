import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { GameSlot } from './game-slot'
import { GameState } from '../../../database/models/game.model'
import type { GameModel, GameNumber } from '../../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../../database/models/game-slot.model'
import type { GameSlotId } from '../../../shared/types/game-slot-id'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { Gamemode } from '../../../shared/types/gamemode'
import { PlayerRole } from '../../../database/models/player.model'
import { collections } from '../../../database/collections'
import { deletedUserSteamId, type SteamId64 } from '../../../shared/types/steam-id-64'

vi.mock('../../../database/collections', () => ({
  collections: {
    players: { findOne: vi.fn() },
  },
}))

const playerSteamId = '76561198000000001' as SteamId64
const actorSteamId = '76561198000000002' as SteamId64

const slotPlayer = {
  steamId: playerSteamId,
  name: 'SlotPlayer',
  avatar: { medium: 'https://example.com/avatar.jpg' },
}

const baseSlot = {
  id: 'red-soldier-0' as GameSlotId,
  player: playerSteamId,
  team: Tf2Team.red,
  gameClass: Tf2ClassName.soldier,
  status: SlotStatus.active,
  connectionStatus: PlayerConnectionStatus.offline,
}

const baseGame = {
  number: 1 as GameNumber,
  gamemode: Gamemode.sixes,
  map: 'cp_badlands',
  state: GameState.launching,
  slots: [baseSlot],
  events: [] as unknown as GameModel['events'],
}

describe('GameSlot', () => {
  describe('captain crown', () => {
    const otherId = '76561198000000003' as SteamId64
    const captains = { red: playerSteamId, blu: actorSteamId }
    const render = async (game: Partial<GameModel>, slot: Partial<typeof baseSlot>) => {
      vi.mocked(collections.players.findOne).mockResolvedValueOnce(slotPlayer)
      const html = await GameSlot({
        game: { ...baseGame, ...game },
        slot: { ...baseSlot, ...slot },
        actor: undefined,
      })
      return parse(html)
    }

    it('crowns a drafted captain', async () => {
      const root = await render({ launchMode: 'captain', captains }, {})
      expect(
        root.querySelector('[role="img"][aria-label="Captain"] .icon-tabler-crown'),
      ).not.toBeNull()
      expect(root.querySelector('.player-link > .player-name + [title="Captain"]')).not.toBeNull()
    })

    it('does not crown a substitute of a captain', async () => {
      const root = await render({ launchMode: 'captain', captains }, { player: otherId })
      expect(root.querySelector('.icon-tabler-crown')).toBeNull()
    })

    it('does not crown deleted users when a deleted captain shares their sentinel id', async () => {
      const root = parse(
        await GameSlot({
          game: {
            ...baseGame,
            launchMode: 'captain',
            captains: { ...captains, red: deletedUserSteamId },
          },
          slot: { ...baseSlot, player: deletedUserSteamId },
          actor: undefined,
        }),
      )
      expect(root.querySelector('[aria-label="deleted user\'s slot"]')).not.toBeNull()
      expect(root.querySelector('.icon-tabler-crown')).toBeNull()
    })

    it('does not crown anyone in an auto game', async () => {
      const root = await render({ captains }, {})
      expect(root.querySelector('.icon-tabler-crown')).toBeNull()
    })
  })

  describe('when slot is active', () => {
    it('renders the player name', async () => {
      vi.mocked(collections.players.findOne).mockResolvedValueOnce(slotPlayer)
      const html = await GameSlot({ game: baseGame, slot: baseSlot, actor: undefined })
      const root = parse(html)
      expect(root.querySelector('.player-name')?.text).toBe('SlotPlayer')
    })

    it('sets the form id to the slot id', async () => {
      vi.mocked(collections.players.findOne).mockResolvedValueOnce(slotPlayer)
      const html = await GameSlot({ game: baseGame, slot: baseSlot, actor: undefined })
      const root = parse(html)
      expect(root.querySelector('form')?.id).toBe('game-slot-red-soldier-0')
    })

    it('shows connection state when game is launching', async () => {
      vi.mocked(collections.players.findOne).mockResolvedValueOnce(slotPlayer)
      const html = await GameSlot({ game: baseGame, slot: baseSlot, actor: undefined })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Player connection status"]')).not.toBeNull()
    })

    it('does not show connection state when game is created', async () => {
      vi.mocked(collections.players.findOne).mockResolvedValueOnce(slotPlayer)
      const game = { ...baseGame, state: GameState.created }
      const html = await GameSlot({ game, slot: baseSlot, actor: undefined })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Player connection status"]')).toBeNull()
    })

    it('shows the substitute button for admins', async () => {
      vi.mocked(collections.players.findOne)
        .mockResolvedValueOnce(slotPlayer)
        .mockResolvedValueOnce({
          roles: [PlayerRole.admin],
          steamId: actorSteamId,
          activeGame: undefined,
        })
      const html = await GameSlot({ game: baseGame, slot: baseSlot, actor: actorSteamId })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Request substitute"]')).not.toBeNull()
    })

    it('does not show the substitute button for non-admins', async () => {
      vi.mocked(collections.players.findOne)
        .mockResolvedValueOnce(slotPlayer)
        .mockResolvedValueOnce({ roles: [], steamId: actorSteamId, activeGame: undefined })
      const html = await GameSlot({ game: baseGame, slot: baseSlot, actor: actorSteamId })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Request substitute"]')).toBeNull()
    })
  })

  describe('when slot is waiting for substitute', () => {
    const waitingSlot = { ...baseSlot, status: SlotStatus.waitingForSubstitute }

    it('shows the replace button when actor is the replaced player', async () => {
      vi.mocked(collections.players.findOne)
        .mockResolvedValueOnce(slotPlayer)
        .mockResolvedValueOnce({ roles: [], steamId: playerSteamId, activeGame: undefined })
      const html = await GameSlot({ game: baseGame, slot: waitingSlot, actor: playerSteamId })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Replace player"]')).not.toBeNull()
    })

    it('shows the replace button when actor has no active game', async () => {
      vi.mocked(collections.players.findOne)
        .mockResolvedValueOnce(slotPlayer)
        .mockResolvedValueOnce({ roles: [], steamId: actorSteamId, activeGame: undefined })
      const html = await GameSlot({ game: baseGame, slot: waitingSlot, actor: actorSteamId })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Replace player"]')).not.toBeNull()
    })

    it('hides the replace button when actor is in a different active game', async () => {
      vi.mocked(collections.players.findOne)
        .mockResolvedValueOnce(slotPlayer)
        .mockResolvedValueOnce({ roles: [], steamId: actorSteamId, activeGame: 42 as GameNumber })
      const html = await GameSlot({ game: baseGame, slot: waitingSlot, actor: actorSteamId })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Replace player"]')).toBeNull()
    })

    it('hides the replace button when there is no actor', async () => {
      vi.mocked(collections.players.findOne).mockResolvedValueOnce(slotPlayer)
      const html = await GameSlot({ game: baseGame, slot: waitingSlot, actor: undefined })
      const root = parse(html)
      expect(root.querySelector('[aria-label="Replace player"]')).toBeNull()
    })
  })
})
