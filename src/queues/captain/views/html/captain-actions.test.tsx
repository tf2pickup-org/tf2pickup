import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import type { PoolView } from '../../types/pool-view'

vi.mock('../../../../pre-ready/views/html/pre-ready-up-button', () => ({
  PreReadyUpButton: () => <button id="pre-ready-up-button">pre-ready</button>,
}))

import { CaptainActions } from './captain-actions'

const red = '76561198000000001' as SteamId64
const blu = '76561198000000002' as SteamId64
const view = {
  draft: { draft: { red, blu } },
  members: [
    { locked: true, player: { steamId: red } },
    { locked: true, player: { steamId: blu } },
    { locked: true, player: { steamId: '76561198000000004' } },
    { locked: false, player: { steamId: '76561198000000005' } },
  ],
} as unknown as PoolView
const noDraft = { members: [] } as unknown as PoolView

async function html(poolView: PoolView, viewer?: SteamId64) {
  return parse(String(await CaptainActions({ view: poolView, viewer })))
}

describe('CaptainActions', () => {
  it.each([red, blu])('gives the captain %s a confirmed CANCEL DRAFT button', async captain => {
    const button = (await html(view, captain)).querySelector('[name=canceldraft]')
    expect(button?.text).toContain('Cancel draft')
    expect(button?.getAttribute('data-ws-confirm')).toBe(
      'Cancel the draft? You will get a cooldown.',
    )
  })

  it.each([
    ['another player', '76561198000000003' as SteamId64],
    ['an anonymous viewer', undefined],
  ])('gives %s no cancel button', async (_name, viewer) => {
    expect((await html(view, viewer)).querySelector('[name=canceldraft]')).toBeNull()
  })

  it('shows no cancel button when no draft is running', async () => {
    expect((await html(noDraft, red)).querySelector('[name=canceldraft]')).toBeNull()
  })

  it.each([
    ['a captain', red, false],
    ['a locked draft member', '76561198000000004' as SteamId64, false],
    ['a next-game sign-up', '76561198000000005' as SteamId64, true],
    ['a spectator', '76561198000000006' as SteamId64, true],
  ])('shows %s the pre-ready button: %s', async (_name, viewer, shown) => {
    expect((await html(view, viewer)).querySelector('#pre-ready-up-button') !== null).toBe(shown)
  })
})
