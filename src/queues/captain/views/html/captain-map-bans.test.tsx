import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import type { PoolView } from '../../types/pool-view'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { CaptainMapBans } from './captain-map-bans'
vi.mock('../../../../html/components/map-thumbnail', () => ({ MapThumbnail: () => <div></div> }))
const blu = 'blu' as SteamId64
const view = {
  state: 'banningMaps',
  draft: {
    draft: { red: 'red', blu, mapOptions: ['cp_a', 'cp_b', 'cp_c'], bans: [] },
    members: [{ player: { steamId: blu, name: 'Blue Captain' } }],
  },
} as unknown as PoolView

describe('CaptainMapBans', () => {
  it('renders buttons only for the captain on the clock', () => {
    const html = parse(String(CaptainMapBans({ view, viewer: blu })))
    expect(html.querySelector('h2')?.text).toBe('Your ban')
    expect(html.querySelectorAll('button[name=banmap]')).toHaveLength(3)
    for (const viewer of ['red' as SteamId64, undefined]) {
      const observer = parse(String(CaptainMapBans({ view, viewer })))
      expect(observer.querySelectorAll('button')).toHaveLength(0)
      expect(observer.querySelector('h2')?.text).toBe('Blue Captain bans map 1')
    }
  })
  it('marks bans and the survivor without interactive cards during launching', () => {
    const final = {
      ...view,
      state: 'launching',
      draft: {
        ...view.draft!,
        draft: {
          ...view.draft!.draft,
          bans: [
            { team: 'blu', map: 'cp_a' },
            { team: 'red', map: 'cp_b' },
          ],
        },
      },
    } as PoolView
    const html = parse(String(CaptainMapBans({ view: final, viewer: blu })))
    expect(html.querySelectorAll('button')).toHaveLength(0)
    expect(html.querySelectorAll('[data-banned]')).toHaveLength(2)
    expect(html.querySelector('h2')?.text).toBe('Heading to cp_c')
    expect(html.text).toContain('Heading to...')
  })
  it('has no map cards while players are still being picked', () => {
    const html = parse(String(CaptainMapBans({ view: { ...view, state: 'drafting' } as PoolView })))
    expect(html.querySelectorAll('.map-vote-button')).toHaveLength(0)
  })
})
