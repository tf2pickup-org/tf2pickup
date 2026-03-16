import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { QueueSlot } from './queue-slot'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { collections } from '../../../database/collections'
import { configuration } from '../../../configuration'
import { meetsSkillThreshold } from '../../meets-skill-threshold'
import type { QueueSlotId } from '../../types/queue-slot-id'
import { PlayerRole, type PlayerBan } from '../../../database/models/player.model'

vi.mock('../../../database/collections', () => ({
  collections: {
    players: { findOne: vi.fn() },
    queueSlots: { findOne: vi.fn() },
    queueFriends: { findOne: vi.fn() },
  },
}))

vi.mock('../../../configuration', () => ({
  configuration: { get: vi.fn() },
}))

vi.mock('../../meets-skill-threshold', () => ({
  meetsSkillThreshold: vi.fn(),
}))

const actor = {
  steamId: '76561198000000001' as SteamId64,
  bans: [] as PlayerBan[],
  activeGame: undefined,
  skill: undefined,
  verified: true,
  roles: [] as PlayerRole[],
}

const emptySlot = {
  id: 'soldier-0' as QueueSlotId,
  gameClass: Tf2ClassName.soldier,
  player: null,
  ready: false,
}

describe('QueueSlot', () => {
  describe('when slot is empty and there is no actor', () => {
    it('renders the slot wrapper', async () => {
      const html = await QueueSlot({ slot: emptySlot })
      const root = parse(html)
      const slot = root.querySelector('.queue-slot')
      expect(slot).not.toBeNull()
      expect(slot!.id).toBe('queue-slot-soldier-0')
      expect(slot!.getAttribute('aria-label')).toBe('Queue slot soldier-0')
      expect(slot!.getAttribute('data-player')).toBeUndefined()
    })

    it('renders no join button', async () => {
      const html = await QueueSlot({ slot: emptySlot })
      const root = parse(html)
      expect(root.querySelector('.join-queue-button')).toBeNull()
    })
  })

  describe('when slot is empty and there is an actor', () => {
    beforeEach(() => {
      vi.mocked(meetsSkillThreshold).mockResolvedValue(true)
      vi.mocked(configuration.get).mockResolvedValue(false)
    })

    it('renders a join button', async () => {
      const html = await QueueSlot({
        slot: emptySlot,
        actor: actor,
      })
      const root = parse(html)
      const button = root.querySelector('.join-queue-button')
      expect(button).not.toBeNull()
      expect(button!.getAttribute('disabled')).toBeUndefined()
    })

    it('renders a disabled join button when actor has active bans', async () => {
      const html = await QueueSlot({
        slot: emptySlot,
        actor: {
          ...actor,
          bans: [
            {
              actor: '76561198000000099' as SteamId64,
              start: new Date(),
              end: new Date(Date.now() + 60_000),
              reason: 'test ban',
            },
          ] as PlayerBan[],
        },
      })
      const root = parse(html)
      const button = root.querySelector('.join-queue-button')
      expect(button).not.toBeNull()
      expect(button!.getAttribute('disabled')).toBeDefined()
    })
  })

  describe('when slot has a player', () => {
    const occupiedSlot = {
      ...emptySlot,
      player: {
        steamId: actor.steamId,
        name: 'Test Player',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    }

    beforeEach(() => {
      vi.mocked(collections.queueSlots.findOne).mockResolvedValue(null)
      vi.mocked(collections.queueFriends.findOne).mockResolvedValue(null)
    })

    it('renders player info', async () => {
      const html = await QueueSlot({ slot: occupiedSlot })
      const root = parse(html)
      expect(root.querySelector('.player-info')).not.toBeNull()
      expect(root.querySelector('.player-name-text')?.text).toBe('Test Player')
    })

    it('sets data-player attribute to the player steamId', async () => {
      const html = await QueueSlot({ slot: occupiedSlot })
      const root = parse(html)
      const slot = root.querySelector('.queue-slot')
      expect(slot!.getAttribute('data-player')).toBe('76561198000000001')
    })

    it('renders the player avatar', async () => {
      const html = await QueueSlot({ slot: occupiedSlot })
      const root = parse(html)
      const img = root.querySelector('img')
      expect(img!.getAttribute('src')).toBe('https://example.com/avatar.jpg')
    })

    it('does not render the skill tooltip for a non-admin actor', async () => {
      const html = await QueueSlot({ slot: occupiedSlot, actor })
      const root = parse(html)
      expect(root.querySelector('.fresh-player-icon')).toBeNull()
    })
  })

  describe('when slot has a player and actor is admin', () => {
    const adminActor = { ...actor, roles: [PlayerRole.admin] }
    const occupiedSlot = {
      id: 'soldier-0' as QueueSlotId,
      gameClass: Tf2ClassName.soldier,
      player: {
        steamId: '76561198000000002' as SteamId64,
        name: 'Test Player',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      ready: false,
    }

    describe('when player has skills set', () => {
      beforeEach(() => {
        vi.mocked(collections.players.findOne).mockResolvedValueOnce({
          skill: { [Tf2ClassName.scout]: 4, [Tf2ClassName.soldier]: 3 },
        })
        vi.mocked(collections.queueSlots.findOne).mockResolvedValue(null)
        vi.mocked(collections.queueFriends.findOne).mockResolvedValue(null)
      })

      it('does not render the clover icon', async () => {
        const html = await QueueSlot({ slot: occupiedSlot, actor: adminActor })
        const root = parse(html)
        expect(root.querySelector('.fresh-player-icon')).toBeNull()
      })

      it('renders skill values in the tooltip on the name area', async () => {
        const html = await QueueSlot({ slot: occupiedSlot, actor: adminActor })
        const root = parse(html)
        const tooltip = root.querySelector('.player-name-area .tooltip')
        expect(tooltip).not.toBeNull()
        expect(tooltip!.text).toContain('4')
        expect(tooltip!.text).toContain('3')
        expect(tooltip!.text).not.toContain('No skill assigned')
      })
    })

    describe('when player has no skill assigned', () => {
      beforeEach(() => {
        vi.mocked(collections.players.findOne).mockResolvedValueOnce({ skill: undefined })
        vi.mocked(collections.queueSlots.findOne).mockResolvedValue(null)
        vi.mocked(collections.queueFriends.findOne).mockResolvedValue(null)
      })

      it('renders the clover icon', async () => {
        const html = await QueueSlot({ slot: occupiedSlot, actor: adminActor })
        const root = parse(html)
        expect(root.querySelector('.fresh-player-icon')).not.toBeNull()
      })

      it('renders "No skill assigned" in the tooltip on the name area', async () => {
        const html = await QueueSlot({ slot: occupiedSlot, actor: adminActor })
        const root = parse(html)
        const tooltip = root.querySelector('.player-name-area .tooltip')
        expect(tooltip).not.toBeNull()
        expect(tooltip!.text).toBe('No skill assigned')
      })
    })
  })
})
