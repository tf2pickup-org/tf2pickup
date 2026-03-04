import { test, expect, type APIResponse } from '@playwright/test'
import { users } from '../data'

const halJson = 'application/hal+json'

interface Link {
  href: string
}
type Links = Record<string, Link>

interface RootResponse {
  _links: Links
}
interface VersionResponse {
  version: string
  _links: Links
}
interface PlayerObject {
  steamId: string
  name: string
  joinedAt: string
  avatar: unknown
  roles: unknown[]
  stats: unknown
  etf2lProfile: unknown
  activeGame: unknown
  _links: Links
}
interface PlayerListResponse {
  total: number
  offset: number
  limit: number
  _links: Links
  _embedded: { players: PlayerObject[] }
}
interface GameObject {
  id: number
  map: string
  state: string
  createdAt: string
  _links: Links
}
interface GameListResponse {
  total: number
  _links: Links
  _embedded: { games: GameObject[] }
}
interface QueueSlot {
  id: string
  gameClass: string
  ready: boolean
  player: { steamId: string; name: string } | null
}
interface QueueResponse {
  state: string
  slots: QueueSlot[]
  mapVoteResults: Record<string, number>
  config: { teamCount: number; classes: { name: string; count: number }[] }
  _links: Links
}
interface OnlinePlayersResponse {
  count: number
  _links: Links
  _embedded: { players: unknown[] }
}

const json = async <T>(res: APIResponse): Promise<T> => res.json() as Promise<T>

test.describe('GET /api/v1/', () => {
  test('returns 200 with HAL content-type', async ({ request }) => {
    const res = await request.get('/api/v1/')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain(halJson)
  })

  test('returns links to all resources', async ({ request }) => {
    const body = await json<RootResponse>(await request.get('/api/v1/'))
    expect(body._links).toMatchObject({
      self: { href: '/api/v1' },
      players: { href: '/api/v1/players' },
      games: { href: '/api/v1/games' },
      queue: { href: '/api/v1/queue' },
      onlinePlayers: { href: '/api/v1/online-players' },
      version: { href: '/api/v1/version' },
    })
  })

  test('sets CORS header', async ({ request }) => {
    const res = await request.get('/api/v1/')
    expect(res.headers()['access-control-allow-origin']).toBe('*')
  })
})

test.describe('GET /api/v1/version', () => {
  test('returns version string', async ({ request }) => {
    const body = await json<VersionResponse>(await request.get('/api/v1/version'))
    expect(typeof body.version).toBe('string')
    expect(body.version.length).toBeGreaterThan(0)
    expect(body._links['self']).toEqual({ href: '/api/v1/version' })
  })
})

test.describe('GET /api/v1/players', () => {
  test('returns paginated HAL list', async ({ request }) => {
    const body = await json<PlayerListResponse>(await request.get('/api/v1/players'))
    expect(typeof body.total).toBe('number')
    expect(typeof body.offset).toBe('number')
    expect(typeof body.limit).toBe('number')
    expect(Array.isArray(body._embedded.players)).toBe(true)
  })

  test('player objects have expected public fields', async ({ request }) => {
    const body = await json<PlayerListResponse>(await request.get('/api/v1/players'))
    const player = body._embedded.players[0]!
    expect(player).toHaveProperty('steamId')
    expect(player).toHaveProperty('name')
    expect(player).toHaveProperty('joinedAt')
    expect(player).toHaveProperty('avatar')
    expect(player).toHaveProperty('roles')
    expect(player).toHaveProperty('stats')
    expect(player._links).toHaveProperty('self')
    expect(player._links).toHaveProperty('games')
  })

  test('player objects do not leak sensitive fields', async ({ request }) => {
    const body = await json<PlayerListResponse>(await request.get('/api/v1/players'))
    const player = body._embedded.players[0]!
    expect(player).not.toHaveProperty('bans')
    expect(player).not.toHaveProperty('skill')
    expect(player).not.toHaveProperty('skillHistory')
    expect(player).not.toHaveProperty('preferences')
    expect(player).not.toHaveProperty('hasAcceptedRules')
    expect(player).not.toHaveProperty('cooldownLevel')
    expect(player).not.toHaveProperty('verified')
    expect(player).not.toHaveProperty('twitchTvProfile')
    expect(player).not.toHaveProperty('preReadyUntil')
  })

  test('omits prev link on first page', async ({ request }) => {
    const body = await json<PlayerListResponse>(
      await request.get('/api/v1/players?offset=0&limit=20'),
    )
    expect(body._links).not.toHaveProperty('prev')
  })

  test('respects limit param', async ({ request }) => {
    const body = await json<PlayerListResponse>(await request.get('/api/v1/players?limit=2'))
    expect(body._embedded.players.length).toBeLessThanOrEqual(2)
  })

  test('returns 400 for non-numeric offset', async ({ request }) => {
    const res = await request.get('/api/v1/players?offset=abc')
    expect(res.status()).toBe(400)
  })
})

test.describe('GET /api/v1/players/:steamId', () => {
  test('returns a known player', async ({ request }) => {
    const steamId = users[0].steamId
    const res = await request.get(`/api/v1/players/${steamId}`)
    expect(res.status()).toBe(200)
    const body = await json<PlayerObject>(res)
    expect(body.steamId).toBe(steamId)
    expect(body._links['self']).toEqual({ href: `/api/v1/players/${steamId}` })
  })

  test('returns 404 for unknown steamId', async ({ request }) => {
    const res = await request.get('/api/v1/players/76561100000000000')
    expect(res.status()).toBe(404)
  })
})

test.describe('GET /api/v1/players/:steamId/games', () => {
  test('returns paginated game list for player', async ({ request }) => {
    const steamId = users[0].steamId
    const body = await json<GameListResponse>(await request.get(`/api/v1/players/${steamId}/games`))
    expect(typeof body.total).toBe('number')
    expect(Array.isArray(body._embedded.games)).toBe(true)
  })
})

test.describe('GET /api/v1/games', () => {
  test('returns paginated HAL list', async ({ request }) => {
    const body = await json<GameListResponse>(await request.get('/api/v1/games'))
    expect(typeof body.total).toBe('number')
    expect(Array.isArray(body._embedded.games)).toBe(true)
  })

  test('game objects have expected fields', async ({ request }) => {
    const body = await json<GameListResponse>(await request.get('/api/v1/games'))
    if (body._embedded.games.length === 0) return
    const game = body._embedded.games[0]!
    expect(game).toHaveProperty('id')
    expect(game).toHaveProperty('map')
    expect(game).toHaveProperty('state')
    expect(game).toHaveProperty('createdAt')
    expect(game._links).toHaveProperty('self')
    expect(game._links).toHaveProperty('slots')
    expect(game._links).toHaveProperty('events')
  })

  test('game objects do not leak sensitive fields', async ({ request }) => {
    const body = await json<GameListResponse>(await request.get('/api/v1/games'))
    if (body._embedded.games.length === 0) return
    const game = body._embedded.games[0]!
    expect(game).not.toHaveProperty('connectString')
    expect(game).not.toHaveProperty('stvConnectString')
    expect(game).not.toHaveProperty('logSecret')
  })

  test('accepts state filter', async ({ request }) => {
    const body = await json<GameListResponse>(await request.get('/api/v1/games?state=ended'))
    for (const game of body._embedded.games) {
      expect(game.state).toBe('ended')
    }
  })

  test('returns 400 for invalid state filter', async ({ request }) => {
    const res = await request.get('/api/v1/games?state=bogus')
    expect(res.status()).toBe(400)
  })
})

test.describe('GET /api/v1/games/:id', () => {
  test('returns 404 for unknown game id', async ({ request }) => {
    const res = await request.get('/api/v1/games/999999')
    expect(res.status()).toBe(404)
  })
})

test.describe('GET /api/v1/queue', () => {
  test('returns queue state', async ({ request }) => {
    const body = await json<QueueResponse>(await request.get('/api/v1/queue'))
    expect(['waiting', 'ready', 'launching']).toContain(body.state)
    expect(Array.isArray(body.slots)).toBe(true)
    expect(typeof body.mapVoteResults).toBe('object')
    expect(body._links['self']).toEqual({ href: '/api/v1/queue' })
  })

  test('queue config has expected shape', async ({ request }) => {
    const body = await json<QueueResponse>(await request.get('/api/v1/queue'))
    expect(typeof body.config.teamCount).toBe('number')
    expect(Array.isArray(body.config.classes)).toBe(true)
    const cls = body.config.classes[0]
    expect(cls).toHaveProperty('name')
    expect(cls).toHaveProperty('count')
  })

  test('queue slots have expected shape', async ({ request }) => {
    const body = await json<QueueResponse>(await request.get('/api/v1/queue'))
    const slot = body.slots[0]!
    expect(slot).toHaveProperty('id')
    expect(slot).toHaveProperty('gameClass')
    expect(slot).toHaveProperty('ready')
    if (slot.player !== null) {
      expect(slot.player).toHaveProperty('steamId')
      expect(slot.player).toHaveProperty('name')
    }
  })
})

test.describe('GET /api/v1/online-players', () => {
  test('returns online player count and list', async ({ request }) => {
    const body = await json<OnlinePlayersResponse>(await request.get('/api/v1/online-players'))
    expect(typeof body.count).toBe('number')
    expect(Array.isArray(body._embedded.players)).toBe(true)
    expect(body._embedded.players).toHaveLength(body.count)
    expect(body._links['self']).toEqual({ href: '/api/v1/online-players' })
  })
})
