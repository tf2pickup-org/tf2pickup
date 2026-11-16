import fastify from 'fastify'
import formbody from '@fastify/formbody'
import html from '@kitajs/fastify-html-plugin'
import type { Children } from '@kitajs/html'
import { requestContext } from '@fastify/request-context'
import { validatorCompiler } from 'fastify-type-provider-zod'
import { parse } from 'node-html-parser'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { configuration } from '../../../configuration'
import { getDefault } from '../../../configuration/get-default'
import { PlayerRole } from '../../../database/models/player.model'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import playerRestrictionsRoutes from './index'

const { saved } = vi.hoisted(() => ({ saved: new Map<string, unknown>() }))

vi.mock('../../../configuration', async () => {
  const { getDefault } = await import('../../../configuration/get-default')
  return {
    configuration: {
      get: vi.fn((key: Parameters<typeof getDefault>[0]) =>
        Promise.resolve(saved.has(key) ? saved.get(key) : getDefault(key)),
      ),
      set: vi.fn((key: string, value: unknown) => {
        saved.set(key, value)
        return Promise.resolve()
      }),
    },
  }
})
vi.mock('../../../queues', () => ({
  queues: { gamemodesInUse: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../../../admin/views/html/admin', () => ({
  Admin: ({ children }: { children: Children }) => children,
}))
vi.mock('@fastify/request-context', () => ({ requestContext: { set: vi.fn() } }))

const actor = steamId64.parse('76561198074409147')

describe('player restrictions ETF2L ban sync settings', () => {
  const app = fastify()

  beforeAll(async () => {
    app.setValidatorCompiler(validatorCompiler)
    await app.register(formbody)
    await app.register(html)
    app.addHook('onRequest', async request => {
      request.user = {
        player: {
          steamId: actor,
          name: 'Admin',
          roles: [PlayerRole.admin],
          avatar: { medium: '' },
          preferences: {},
          hasAcceptedRules: true,
        },
      }
    })
    await app.register(playerRestrictionsRoutes)
    await app.ready()
  })

  beforeEach(() => {
    saved.clear()
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await app.close()
  })

  function save(reasons: string, enabled = true) {
    return app.inject({
      method: 'POST',
      url: '/',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        ...(enabled ? { etf2lBanSync: 'on' } : {}),
        etf2lBanSyncReasons: reasons,
        minimumInGameHours: '0',
        skillStep: '1',
      }).toString(),
    })
  }

  it('renders the switch off and all seven default reasons', async () => {
    const response = await app.inject('/')
    expect(response.statusCode).toBe(200)
    const page = parse(response.body)
    expect(page.querySelector('#etf2lBanSync')?.hasAttribute('checked')).toBe(false)
    expect(page.querySelector('#etf2lBanSyncReasons')?.textContent).toBe(
      getDefault('players.etf2l_ban_sync_reasons').join('\n'),
    )
    expect(getDefault('players.etf2l_ban_sync_reasons')).toHaveLength(7)
  })

  it('saves trimmed nonempty reasons and reloads the enabled switch', async () => {
    const response = await save('Cheating\n\n  toxicity  \n')
    expect(response.statusCode).toBe(200)
    expect(configuration.set).toHaveBeenCalledWith('players.etf2l_ban_sync', true, actor)
    expect(configuration.set).toHaveBeenCalledWith(
      'players.etf2l_ban_sync_reasons',
      ['Cheating', 'toxicity'],
      actor,
    )
    expect(requestContext.set).toHaveBeenCalledWith('messages', {
      success: ['Configuration saved'],
    })
    const page = parse((await app.inject('/')).body)
    expect(page.querySelector('#etf2lBanSync')?.hasAttribute('checked')).toBe(true)
    expect(page.querySelector('#etf2lBanSyncReasons')?.textContent).toBe('Cheating\ntoxicity')
  })

  it.each(['', ' \r\n\t\n'])('saves an empty reason list from %j', async reasons => {
    expect((await save(reasons)).statusCode).toBe(200)
    expect(saved.get('players.etf2l_ban_sync_reasons')).toEqual([])
  })

  it('turns synchronization off when the checkbox is unchecked', async () => {
    saved.set('players.etf2l_ban_sync', true)
    expect((await save('cheating', false)).statusCode).toBe(200)
    expect(saved.get('players.etf2l_ban_sync')).toBe(false)
  })

  it('escapes custom reasons when rendering the textarea', async () => {
    const reason = '</textarea><script>alert(1)</script>'
    const response = await save(reason)
    expect(response.statusCode).toBe(200)
    const page = parse(response.body)
    expect(page.querySelector('script')).toBeNull()
    expect(page.querySelector('#etf2lBanSyncReasons')?.textContent).toBe(reason)
  })
})
