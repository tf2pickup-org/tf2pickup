import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { GameEventList } from './game-event-list'
import { GameEventType, type GameEventModel } from '../../../database/models/game-event.model'
import type { GameModel, GameNumber } from '../../../database/models/game.model'
import { deletedUserSteamId, type SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'

const mockPlayersFindOne = vi.hoisted(() => vi.fn())
vi.mock('../../../database/collections', () => ({
  collections: { players: { findOne: mockPlayersFindOne } },
}))

const alder = '76561198000000001' as SteamId64
const mira = '76561198000000002' as SteamId64
// no timezone suffix: the event list formats timestamps in local time
const at = new Date('2026-11-17T05:31:33')

function game(events: GameEventModel[]): GameModel {
  return { number: 24 as GameNumber, events } as unknown as GameModel
}

function eventListText(events: GameEventModel[]) {
  return GameEventList({ game: game(events) }).then(html =>
    parse(html).querySelector('.game-event-list')?.text.replace(/\s+/g, ' ').trim(),
  )
}

describe('GameEventList', () => {
  beforeEach(() => {
    mockPlayersFindOne.mockImplementation((query: { steamId: SteamId64 }) =>
      Promise.resolve({ steamId: query.steamId, name: query.steamId === alder ? 'Alder' : 'Mira' }),
    )
  })

  it('renders "X replaced Y on class" when a different player takes the slot', async () => {
    const text = await eventListText([
      {
        event: GameEventType.playerReplaced,
        at,
        replacee: alder,
        replacement: mira,
        gameClass: Tf2ClassName.medic,
      },
    ])

    expect(text).toBe('05:31:33Mira replaced Alder on medic')
  })

  it('renders "X rejoined on class" when the same player takes their own slot back', async () => {
    const text = await eventListText([
      {
        event: GameEventType.playerReplaced,
        at,
        replacee: alder,
        replacement: alder,
        gameClass: Tf2ClassName.medic,
      },
    ])

    expect(text).toBe('05:31:33Alder rejoined on medic')
  })

  it('still renders "replaced" when both players were deleted and share the sentinel id', async () => {
    const text = await eventListText([
      {
        event: GameEventType.playerReplaced,
        at,
        replacee: deletedUserSteamId,
        replacement: deletedUserSteamId,
        gameClass: Tf2ClassName.medic,
      },
    ])

    expect(text).toContain('replaced')
    expect(text).not.toContain('rejoined')
  })
})
