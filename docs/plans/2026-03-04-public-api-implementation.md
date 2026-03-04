# Public REST API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a read-only public REST API at `/api/v1/` exposing players, games, queue state, and app metadata using HAL+JSON hypermedia format.

**Architecture:** New route files under `src/routes/api/v1/` are auto-loaded by Fastify's autoload with `dirNameRoutePrefix: true`. Shared DTO mapper functions live in `src/routes/api/v1/dto/` (one export per file, per project convention). Tests cover all mapper logic using vitest.

**Tech Stack:** Fastify 5, Zod (query param validation), MongoDB raw driver via `collections.*`, vitest for unit tests.

**Design doc:** `docs/plans/2026-03-04-public-api-design.md`

---

## File Map

```
src/routes/api/v1/
├── dto/
│   ├── player-to-dto.ts          # playerToDto() — pure mapper, tested
│   ├── player-to-dto.test.ts
│   ├── game-to-dto.ts            # gameToDto() — pure mapper, tested
│   ├── game-to-dto.test.ts
│   └── game-event-to-public-dto.ts  # gameEventToPublicDto() — filter+map, tested
│   └── game-event-to-public-dto.test.ts
├── index.ts                      # GET /api/v1/ (root)
├── version/index.ts              # GET /api/v1/version
├── players/
│   ├── index.ts                  # GET /api/v1/players
│   └── :steamId/
│       ├── index.ts              # GET /api/v1/players/:steamId
│       └── games/
│           └── index.ts          # GET /api/v1/players/:steamId/games
├── games/
│   ├── index.ts                  # GET /api/v1/games
│   └── :id/
│       ├── index.ts              # GET /api/v1/games/:id
│       ├── slots/
│       │   └── index.ts          # GET /api/v1/games/:id/slots
│       └── events/
│           └── index.ts          # GET /api/v1/games/:id/events
├── queue/
│   └── index.ts                  # GET /api/v1/queue
└── online-players/
    └── index.ts                  # GET /api/v1/online-players
docs/api/
└── README.md                     # Public API documentation
```

---

## Task 1: Add CORS hook for `/api/` routes

**Files:**

- Modify: `src/main.ts`

**Step 1: Add onSend hook for CORS**

In `src/main.ts`, find the existing `app.setErrorHandler(...)` block and add the hook **before** it:

```typescript
app.addHook('onSend', async (request, reply) => {
  if (request.url.startsWith('/api/')) {
    reply.header('Access-Control-Allow-Origin', '*')
  }
})
```

**Step 2: Manually verify**

```bash
pnpm dev
# In another terminal:
curl -I http://localhost:3000/api/v1/
# Expected: Access-Control-Allow-Origin: * header in response
```

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(api): add CORS headers for /api/ routes"
```

---

## Task 2: Create `playerToDto` mapper

**Files:**

- Create: `src/routes/api/v1/dto/player-to-dto.ts`
- Create: `src/routes/api/v1/dto/player-to-dto.test.ts`

**Step 1: Write the failing test**

```typescript
// src/routes/api/v1/dto/player-to-dto.test.ts
import { describe, expect, it } from 'vitest'
import { playerToDto } from './player-to-dto'
import type { PlayerModel } from '../../../../database/models/player.model'
import { PlayerRole } from '../../../../database/models/player.model'

const basePlayer: PlayerModel = {
  steamId: '76561198012345678' as any,
  name: 'TestPlayer',
  joinedAt: new Date('2024-01-01T00:00:00.000Z'),
  avatar: { small: 'small.jpg', medium: 'medium.jpg', large: 'large.jpg' },
  roles: [],
  hasAcceptedRules: true,
  cooldownLevel: 0,
  preferences: {},
  stats: { totalGames: 42, gamesByClass: { soldier: 30, scout: 12 } },
}

describe('playerToDto()', () => {
  it('maps basic fields', () => {
    const result = playerToDto(basePlayer)
    expect(result.steamId).toBe('76561198012345678')
    expect(result.name).toBe('TestPlayer')
    expect(result.joinedAt).toBe('2024-01-01T00:00:00.000Z')
    expect(result.avatar).toEqual(basePlayer.avatar)
    expect(result.roles).toEqual([])
    expect(result.stats).toEqual({ totalGames: 42, gamesByClass: { soldier: 30, scout: 12 } })
  })

  it('returns null for etf2lProfile when not set', () => {
    const result = playerToDto(basePlayer)
    expect(result.etf2lProfile).toBeNull()
  })

  it('includes etf2lProfile when set', () => {
    const player = { ...basePlayer, etf2lProfile: { id: 1, name: 'p', country: 'PL' } }
    expect(playerToDto(player).etf2lProfile).toEqual({ id: 1, name: 'p', country: 'PL' })
  })

  it('returns null for activeGame when not set', () => {
    expect(playerToDto(basePlayer).activeGame).toBeNull()
  })

  it('includes activeGame when set', () => {
    const player = { ...basePlayer, activeGame: 42 as any }
    expect(playerToDto(player).activeGame).toBe(42)
  })

  it('includes self and games links', () => {
    const result = playerToDto(basePlayer)
    expect(result._links.self.href).toBe('/api/v1/players/76561198012345678')
    expect(result._links.games.href).toBe('/api/v1/players/76561198012345678/games')
  })

  it('omits sensitive fields (bans, skill, preferences, etc.)', () => {
    const player = {
      ...basePlayer,
      bans: [{ actor: '...' as any, start: new Date(), end: new Date(), reason: 'x' }],
      skill: { soldier: 4 },
    }
    const result = playerToDto(player) as any
    expect(result).not.toHaveProperty('bans')
    expect(result).not.toHaveProperty('skill')
    expect(result).not.toHaveProperty('preferences')
    expect(result).not.toHaveProperty('hasAcceptedRules')
    expect(result).not.toHaveProperty('cooldownLevel')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- src/routes/api/v1/dto/player-to-dto.test.ts
# Expected: FAIL — playerToDto not found
```

**Step 3: Write the implementation**

```typescript
// src/routes/api/v1/dto/player-to-dto.ts
import type { PlayerModel } from '../../../../database/models/player.model'

export function playerToDto(player: PlayerModel) {
  return {
    steamId: player.steamId,
    name: player.name,
    joinedAt: player.joinedAt.toISOString(),
    avatar: player.avatar,
    roles: player.roles,
    stats: player.stats,
    etf2lProfile: player.etf2lProfile ?? null,
    activeGame: player.activeGame ?? null,
    _links: {
      self: { href: `/api/v1/players/${player.steamId}` },
      games: { href: `/api/v1/players/${player.steamId}/games` },
    },
  }
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- src/routes/api/v1/dto/player-to-dto.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add src/routes/api/v1/dto/player-to-dto.ts src/routes/api/v1/dto/player-to-dto.test.ts
git commit -m "feat(api): add playerToDto mapper"
```

---

## Task 3: Create `gameToDto` mapper

**Files:**

- Create: `src/routes/api/v1/dto/game-to-dto.ts`
- Create: `src/routes/api/v1/dto/game-to-dto.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/routes/api/v1/dto/game-to-dto.test.ts
import { describe, expect, it } from 'vitest'
import { gameToDto } from './game-to-dto'
import type { GameModel } from '../../../../database/models/game.model'
import { GameState, GameServerProvider } from '../../../../database/models/game.model'
import { GameEventType } from '../../../../database/models/game-event.model'
import { GameEndedReason } from '../../../../database/models/game-event.model'
import { SlotStatus, PlayerConnectionStatus } from '../../../../database/models/game-slot.model'

const createdAt = new Date('2024-01-01T00:00:00.000Z')
const endedAt = new Date('2024-01-01T01:00:00.000Z')

const baseGame: GameModel = {
  number: 1234 as any,
  map: 'cp_process_final',
  state: GameState.ended,
  slots: [],
  events: [{ event: GameEventType.gameCreated, at: createdAt }],
}

describe('gameToDto()', () => {
  it('maps basic fields', () => {
    const result = gameToDto(baseGame)
    expect(result.id).toBe(1234)
    expect(result.map).toBe('cp_process_final')
    expect(result.state).toBe('ended')
  })

  it('extracts createdAt from first event', () => {
    expect(gameToDto(baseGame).createdAt).toBe('2024-01-01T00:00:00.000Z')
  })

  it('returns null for endedAt when game has not ended', () => {
    expect(gameToDto(baseGame).endedAt).toBeNull()
  })

  it('extracts endedAt from gameEnded event', () => {
    const game: GameModel = {
      ...baseGame,
      events: [
        { event: GameEventType.gameCreated, at: createdAt },
        { event: GameEventType.gameEnded, at: endedAt, reason: GameEndedReason.matchEnded },
      ],
    }
    expect(gameToDto(game).endedAt).toBe('2024-01-01T01:00:00.000Z')
  })

  it('returns null for score when not set', () => {
    expect(gameToDto(baseGame).score).toBeNull()
  })

  it('includes score when set', () => {
    const game = { ...baseGame, score: { red: 3, blu: 2 } }
    expect(gameToDto(game).score).toEqual({ red: 3, blu: 2 })
  })

  it('returns null for gameServer when not set', () => {
    expect(gameToDto(baseGame).gameServer).toBeNull()
  })

  it('exposes only name and provider from gameServer', () => {
    const game = {
      ...baseGame,
      gameServer: {
        id: 'gs1',
        provider: GameServerProvider.static,
        name: 'EU #1',
        address: '1.2.3.4',
        port: '27015',
        rcon: { address: '1.2.3.4', port: '27015', password: 'secret' },
      },
    }
    expect(gameToDto(game).gameServer).toEqual({ name: 'EU #1', provider: 'static' })
  })

  it('includes HAL links', () => {
    const result = gameToDto(baseGame)
    expect(result._links.self.href).toBe('/api/v1/games/1234')
    expect(result._links.slots.href).toBe('/api/v1/games/1234/slots')
    expect(result._links.events.href).toBe('/api/v1/games/1234/events')
  })

  it('omits connectString and stvConnectString', () => {
    const game = {
      ...baseGame,
      connectString: 'connect 1.2.3.4:27015; password secret',
      stvConnectString: 'connect 1.2.3.4:27020',
    }
    const result = gameToDto(game) as any
    expect(result).not.toHaveProperty('connectString')
    expect(result).not.toHaveProperty('stvConnectString')
    expect(result).not.toHaveProperty('logSecret')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- src/routes/api/v1/dto/game-to-dto.test.ts
# Expected: FAIL — gameToDto not found
```

**Step 3: Write the implementation**

```typescript
// src/routes/api/v1/dto/game-to-dto.ts
import { GameEventType } from '../../../../database/models/game-event.model'
import type { GameModel } from '../../../../database/models/game.model'

export function gameToDto(game: GameModel) {
  const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

  return {
    id: game.number,
    map: game.map,
    state: game.state,
    score: game.score ?? null,
    logsUrl: game.logsUrl ?? null,
    demoUrl: game.demoUrl ?? null,
    createdAt: game.events[0].at.toISOString(),
    endedAt: endedEvent ? endedEvent.at.toISOString() : null,
    gameServer: game.gameServer
      ? { name: game.gameServer.name, provider: game.gameServer.provider }
      : null,
    _links: {
      self: { href: `/api/v1/games/${game.number}` },
      slots: { href: `/api/v1/games/${game.number}/slots` },
      events: { href: `/api/v1/games/${game.number}/events` },
    },
  }
}
```

**Step 4: Run tests**

```bash
pnpm test -- src/routes/api/v1/dto/game-to-dto.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add src/routes/api/v1/dto/game-to-dto.ts src/routes/api/v1/dto/game-to-dto.test.ts
git commit -m "feat(api): add gameToDto mapper"
```

---

## Task 4: Create `gameEventToPublicDto` mapper

**Files:**

- Create: `src/routes/api/v1/dto/game-event-to-public-dto.ts`
- Create: `src/routes/api/v1/dto/game-event-to-public-dto.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/routes/api/v1/dto/game-event-to-public-dto.test.ts
import { describe, expect, it } from 'vitest'
import { gameEventToPublicDto } from './game-event-to-public-dto'
import { GameEventType, GameEndedReason } from '../../../../database/models/game-event.model'

const at = new Date('2024-01-01T12:00:00.000Z')
const atStr = '2024-01-01T12:00:00.000Z'

describe('gameEventToPublicDto()', () => {
  it('returns null for gameServerAssignmentFailed (excluded)', () => {
    const event = { event: GameEventType.gameServerAssignmentFailed, at, reason: 'unavailable' }
    expect(gameEventToPublicDto(event)).toBeNull()
  })

  it('returns null for gameServerReinitializationOrdered (excluded)', () => {
    const event = { event: GameEventType.gameServerReinitializationOrdered, at }
    expect(gameEventToPublicDto(event)).toBeNull()
  })

  it('maps gameCreated with type "gameCreated"', () => {
    const event = { event: GameEventType.gameCreated, at }
    expect(gameEventToPublicDto(event)).toEqual({ type: 'gameCreated', at: atStr })
  })

  it('maps gameStarted', () => {
    expect(gameEventToPublicDto({ event: GameEventType.gameStarted, at })).toEqual({
      type: 'gameStarted',
      at: atStr,
    })
  })

  it('maps gameRestarted', () => {
    expect(gameEventToPublicDto({ event: GameEventType.gameRestarted, at })).toEqual({
      type: 'gameRestarted',
      at: atStr,
    })
  })

  it('maps gameEnded with reason, without actor', () => {
    const event = {
      event: GameEventType.gameEnded,
      at,
      reason: GameEndedReason.matchEnded,
      actor: '76561198...' as any,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'gameEnded', at: atStr, reason: 'match ended' })
    expect(result).not.toHaveProperty('actor')
  })

  it('maps gameServerAssigned with gameServerName, without actor', () => {
    const event = {
      event: GameEventType.gameServerAssigned,
      at,
      gameServerName: 'EU #1',
      actor: 'bot' as any,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'gameServerAssigned', at: atStr, gameServerName: 'EU #1' })
    expect(result).not.toHaveProperty('actor')
  })

  it('maps gameServerInitialized', () => {
    expect(gameEventToPublicDto({ event: GameEventType.gameServerInitialized, at })).toEqual({
      type: 'gameServerInitialized',
      at: atStr,
    })
  })

  it('maps substituteRequested with gameClass only — omits player and actor', () => {
    const event = {
      event: GameEventType.substituteRequested,
      at,
      player: '765...' as any,
      gameClass: 'medic' as any,
      actor: '765...' as any,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'substituteRequested', at: atStr, gameClass: 'medic' })
    expect(result).not.toHaveProperty('player')
    expect(result).not.toHaveProperty('actor')
  })

  it('maps playerReplaced with gameClass only — omits player steamIds', () => {
    const event = {
      event: GameEventType.playerReplaced,
      at,
      replacee: '765a' as any,
      replacement: '765b' as any,
      gameClass: 'medic' as any,
    }
    const result = gameEventToPublicDto(event)
    expect(result).toEqual({ type: 'playerReplaced', at: atStr, gameClass: 'medic' })
    expect(result).not.toHaveProperty('replacee')
    expect(result).not.toHaveProperty('replacement')
  })

  it('maps playerJoinedGameServer with player steamId', () => {
    const event = { event: GameEventType.playerJoinedGameServer, at, player: '76561198...' as any }
    expect(gameEventToPublicDto(event)).toEqual({
      type: 'playerJoinedGameServer',
      at: atStr,
      player: '76561198...',
    })
  })

  it('maps playerJoinedGameServerTeam with player and team', () => {
    const event = {
      event: GameEventType.playerJoinedGameServerTeam,
      at,
      player: '765...' as any,
      team: 'red' as any,
    }
    expect(gameEventToPublicDto(event)).toEqual({
      type: 'playerJoinedGameServerTeam',
      at: atStr,
      player: '765...',
      team: 'red',
    })
  })

  it('maps playerLeftGameServer with player steamId', () => {
    const event = { event: GameEventType.playerLeftGameServer, at, player: '76561198...' as any }
    expect(gameEventToPublicDto(event)).toEqual({
      type: 'playerLeftGameServer',
      at: atStr,
      player: '76561198...',
    })
  })

  it('maps roundEnded with all fields', () => {
    const event = {
      event: GameEventType.roundEnded,
      at,
      winner: 'red' as any,
      lengthMs: 300000,
      score: { red: 1, blu: 0 },
    }
    expect(gameEventToPublicDto(event)).toEqual({
      type: 'roundEnded',
      at: atStr,
      winner: 'red',
      lengthMs: 300000,
      score: { red: 1, blu: 0 },
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- src/routes/api/v1/dto/game-event-to-public-dto.test.ts
# Expected: FAIL
```

**Step 3: Write the implementation**

```typescript
// src/routes/api/v1/dto/game-event-to-public-dto.ts
import { GameEventType, type GameEventModel } from '../../../../database/models/game-event.model'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicEvent = Record<string, any>

export function gameEventToPublicDto(event: GameEventModel): PublicEvent | null {
  const at = event.at.toISOString()

  switch (event.event) {
    case GameEventType.gameCreated:
      return { type: 'gameCreated', at }

    case GameEventType.gameStarted:
      return { type: 'gameStarted', at }

    case GameEventType.gameRestarted:
      return { type: 'gameRestarted', at }

    case GameEventType.gameEnded:
      return { type: 'gameEnded', at, reason: event.reason }

    case GameEventType.gameServerAssigned:
      return { type: 'gameServerAssigned', at, gameServerName: event.gameServerName }

    case GameEventType.gameServerInitialized:
      return { type: 'gameServerInitialized', at }

    case GameEventType.substituteRequested:
      return { type: 'substituteRequested', at, gameClass: event.gameClass }

    case GameEventType.playerReplaced:
      return { type: 'playerReplaced', at, gameClass: event.gameClass }

    case GameEventType.playerJoinedGameServer:
      return { type: 'playerJoinedGameServer', at, player: event.player }

    case GameEventType.playerJoinedGameServerTeam:
      return { type: 'playerJoinedGameServerTeam', at, player: event.player, team: event.team }

    case GameEventType.playerLeftGameServer:
      return { type: 'playerLeftGameServer', at, player: event.player }

    case GameEventType.roundEnded:
      return {
        type: 'roundEnded',
        at,
        winner: event.winner,
        lengthMs: event.lengthMs,
        score: event.score,
      }

    case GameEventType.gameServerAssignmentFailed:
    case GameEventType.gameServerReinitializationOrdered:
      return null
  }
}
```

**Step 4: Run tests**

```bash
pnpm test -- src/routes/api/v1/dto/game-event-to-public-dto.test.ts
# Expected: PASS
```

**Step 5: Commit**

```bash
git add src/routes/api/v1/dto/game-event-to-public-dto.ts src/routes/api/v1/dto/game-event-to-public-dto.test.ts
git commit -m "feat(api): add gameEventToPublicDto mapper"
```

---

## Task 5: Root endpoint

**Files:**

- Create: `src/routes/api/v1/index.ts`

**Step 1: Create the file**

```typescript
// src/routes/api/v1/index.ts
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        _links: {
          self: { href: '/api/v1' },
          players: { href: '/api/v1/players' },
          games: { href: '/api/v1/games' },
          queue: { href: '/api/v1/queue' },
          onlinePlayers: { href: '/api/v1/online-players' },
          version: { href: '/api/v1/version' },
        },
      })
  })
})
```

**Step 2: Manually verify**

```bash
pnpm dev
curl http://localhost:3000/api/v1/
# Expected: JSON with _links to all resources
```

**Step 3: Commit**

```bash
git add src/routes/api/v1/index.ts
git commit -m "feat(api): add root endpoint GET /api/v1/"
```

---

## Task 6: Version endpoint

**Files:**

- Create: `src/routes/api/v1/version/index.ts`

**Step 1: Create the file**

```typescript
// src/routes/api/v1/version/index.ts
import { routes } from '../../../../utils/routes'
import { version } from '../../../../version'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        version,
        _links: {
          self: { href: '/api/v1/version' },
        },
      })
  })
})
```

**Step 2: Manually verify**

```bash
curl http://localhost:3000/api/v1/version/
# Expected: { "version": "4.0.0-rc.4", "_links": { "self": { "href": "/api/v1/version" } } }
```

**Step 3: Commit**

```bash
git add src/routes/api/v1/version/index.ts
git commit -m "feat(api): add GET /api/v1/version"
```

---

## Task 7: Players list endpoint

**Files:**

- Create: `src/routes/api/v1/players/index.ts`

**Step 1: Create the file**

```typescript
// src/routes/api/v1/players/index.ts
import z from 'zod'
import { routes } from '../../../../utils/routes'
import { collections } from '../../../../database/collections'
import { playerToDto } from '../dto/player-to-dto'

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: querySchema,
      },
    },
    async (request, reply) => {
      const { offset, limit } = request.query
      const total = await collections.players.countDocuments()
      const players = await collections.players
        .find()
        .sort({ joinedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray()

      const self = `/api/v1/players?offset=${offset}&limit=${limit}`
      const links: Record<string, { href: string }> = { self: { href: self } }
      if (offset + limit < total) {
        links['next'] = { href: `/api/v1/players?offset=${offset + limit}&limit=${limit}` }
      }
      if (offset > 0) {
        links['prev'] = {
          href: `/api/v1/players?offset=${Math.max(0, offset - limit)}&limit=${limit}`,
        }
      }

      return reply
        .type('application/hal+json')
        .status(200)
        .send({
          total,
          offset,
          limit,
          _links: links,
          _embedded: { players: players.map(playerToDto) },
        })
    },
  )
})
```

**Step 2: Manually verify**

```bash
curl 'http://localhost:3000/api/v1/players/?offset=0&limit=5'
# Expected: paginated player list with _links and _embedded.players
```

**Step 3: Commit**

```bash
git add src/routes/api/v1/players/index.ts
git commit -m "feat(api): add GET /api/v1/players"
```

---

## Task 8: Single player + player games endpoints

**Files:**

- Create: `src/routes/api/v1/players/:steamId/index.ts`
- Create: `src/routes/api/v1/players/:steamId/games/index.ts`

**Step 1: Create single player endpoint**

```typescript
// src/routes/api/v1/players/:steamId/index.ts
import z from 'zod'
import { routes } from '../../../../../utils/routes'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { collections } from '../../../../../database/collections'
import { errors } from '../../../../../errors'
import { playerToDto } from '../../dto/player-to-dto'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ steamId: steamId64 }),
      },
    },
    async (request, reply) => {
      const player = await collections.players.findOne({ steamId: request.params.steamId })
      if (!player) {
        throw errors.notFound('Player not found')
      }
      return reply.type('application/hal+json').status(200).send(playerToDto(player))
    },
  )
})
```

**Step 2: Create player's games endpoint**

```typescript
// src/routes/api/v1/players/:steamId/games/index.ts
import z from 'zod'
import { routes } from '../../../../../../utils/routes'
import { steamId64 } from '../../../../../../shared/schemas/steam-id-64'
import { collections } from '../../../../../../database/collections'
import { errors } from '../../../../../../errors'
import { gameToDto } from '../../../dto/game-to-dto'

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ steamId: steamId64 }),
        querystring: querySchema,
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      const { offset, limit } = request.query

      const playerExists = await collections.players.findOne(
        { steamId },
        { projection: { _id: 1 } },
      )
      if (!playerExists) {
        throw errors.notFound('Player not found')
      }

      const filter = { 'slots.player': steamId }
      const total = await collections.games.countDocuments(filter)
      const gamesList = await collections.games
        .find(filter)
        .sort({ number: -1 })
        .skip(offset)
        .limit(limit)
        .toArray()

      const self = `/api/v1/players/${steamId}/games?offset=${offset}&limit=${limit}`
      const links: Record<string, { href: string }> = { self: { href: self } }
      if (offset + limit < total) {
        links['next'] = {
          href: `/api/v1/players/${steamId}/games?offset=${offset + limit}&limit=${limit}`,
        }
      }
      if (offset > 0) {
        links['prev'] = {
          href: `/api/v1/players/${steamId}/games?offset=${Math.max(0, offset - limit)}&limit=${limit}`,
        }
      }

      return reply
        .type('application/hal+json')
        .status(200)
        .send({
          total,
          offset,
          limit,
          _links: links,
          _embedded: { games: gamesList.map(gameToDto) },
        })
    },
  )
})
```

**Step 3: Manually verify**

```bash
curl http://localhost:3000/api/v1/players/76561198012345678/
curl http://localhost:3000/api/v1/players/76561198012345678/games/
curl http://localhost:3000/api/v1/players/00000000000000000/
# Expected: 404 for non-existent player
```

**Step 4: Commit**

```bash
git add src/routes/api/v1/players/:steamId/index.ts src/routes/api/v1/players/:steamId/games/index.ts
git commit -m "feat(api): add GET /api/v1/players/:steamId and player games"
```

---

## Task 9: Games list + single game endpoints

**Files:**

- Create: `src/routes/api/v1/games/index.ts`
- Create: `src/routes/api/v1/games/:id/index.ts`

**Step 1: Create games list endpoint**

```typescript
// src/routes/api/v1/games/index.ts
import z from 'zod'
import { routes } from '../../../../utils/routes'
import { collections } from '../../../../database/collections'
import { GameState } from '../../../../database/models/game.model'
import { gameToDto } from '../dto/game-to-dto'

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  state: z.nativeEnum(GameState).optional(),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', { schema: { querystring: querySchema } }, async (request, reply) => {
    const { offset, limit, state } = request.query
    const filter = state ? { state } : {}
    const total = await collections.games.countDocuments(filter)
    const gamesList = await collections.games
      .find(filter)
      .sort({ number: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()

    const stateParam = state ? `&state=${state}` : ''
    const self = `/api/v1/games?offset=${offset}&limit=${limit}${stateParam}`
    const links: Record<string, { href: string }> = { self: { href: self } }
    if (offset + limit < total) {
      links['next'] = { href: `/api/v1/games?offset=${offset + limit}&limit=${limit}${stateParam}` }
    }
    if (offset > 0) {
      links['prev'] = {
        href: `/api/v1/games?offset=${Math.max(0, offset - limit)}&limit=${limit}${stateParam}`,
      }
    }

    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        total,
        offset,
        limit,
        _links: links,
        _embedded: { games: gamesList.map(gameToDto) },
      })
  })
})
```

**Step 2: Create single game endpoint**

The directory name `:id` maps to the `:id` route parameter. Use the existing `games.schemas.gameNumber` to coerce and validate.

```typescript
// src/routes/api/v1/games/:id/index.ts
import z from 'zod'
import { routes } from '../../../../../utils/routes'
import { games } from '../../../../../games'
import { gameToDto } from '../../dto/game-to-dto'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ id: games.schemas.gameNumber }),
      },
    },
    async (request, reply) => {
      const game = await games.findOne({ number: request.params.id })
      return reply.type('application/hal+json').status(200).send(gameToDto(game))
    },
  )
})
```

**Step 3: Manually verify**

```bash
curl http://localhost:3000/api/v1/games/
curl http://localhost:3000/api/v1/games/?state=ended
curl http://localhost:3000/api/v1/games/1/
curl http://localhost:3000/api/v1/games/999999/
# Expected: 404 for non-existent game
```

**Step 4: Commit**

```bash
git add src/routes/api/v1/games/index.ts "src/routes/api/v1/games/:id/index.ts"
git commit -m "feat(api): add GET /api/v1/games and /api/v1/games/:id"
```

---

## Task 10: Game slots endpoint

**Files:**

- Create: `src/routes/api/v1/games/:id/slots/index.ts`

Game slots store only `player: SteamId64`. We need to look up player names from the players collection.

**Step 1: Create the file**

```typescript
// src/routes/api/v1/games/:id/slots/index.ts
import z from 'zod'
import { routes } from '../../../../../../utils/routes'
import { games } from '../../../../../../games'
import { collections } from '../../../../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ id: games.schemas.gameNumber }),
      },
    },
    async (request, reply) => {
      const game = await games.findOne({ number: request.params.id })

      const steamIds = game.slots.map(s => s.player)
      const playerDocs = await collections.players
        .find({ steamId: { $in: steamIds } }, { projection: { steamId: 1, name: 1 } })
        .toArray()
      const playerMap = new Map(playerDocs.map(p => [p.steamId, p]))

      const slots = game.slots.map(slot => ({
        id: slot.id,
        player: (() => {
          const p = playerMap.get(slot.player)
          return p
            ? {
                steamId: p.steamId,
                name: p.name,
                _links: { self: { href: `/api/v1/players/${p.steamId}` } },
              }
            : {
                steamId: slot.player,
                name: null,
                _links: { self: { href: `/api/v1/players/${slot.player}` } },
              }
        })(),
        team: slot.team,
        gameClass: slot.gameClass,
        status: slot.status,
        connectionStatus: slot.connectionStatus,
      }))

      return reply
        .type('application/hal+json')
        .status(200)
        .send({
          _links: {
            self: { href: `/api/v1/games/${game.number}/slots` },
            game: { href: `/api/v1/games/${game.number}` },
          },
          _embedded: { slots },
        })
    },
  )
})
```

**Step 2: Manually verify**

```bash
curl http://localhost:3000/api/v1/games/1/slots/
# Expected: _embedded.slots array with player name, team, gameClass, status, connectionStatus
```

**Step 3: Commit**

```bash
git add "src/routes/api/v1/games/:id/slots/index.ts"
git commit -m "feat(api): add GET /api/v1/games/:id/slots"
```

---

## Task 11: Game events endpoint

**Files:**

- Create: `src/routes/api/v1/games/:id/events/index.ts`

**Step 1: Create the file**

```typescript
// src/routes/api/v1/games/:id/events/index.ts
import z from 'zod'
import { routes } from '../../../../../../utils/routes'
import { games } from '../../../../../../games'
import { gameEventToPublicDto } from '../../../dto/game-event-to-public-dto'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ id: games.schemas.gameNumber }),
      },
    },
    async (request, reply) => {
      const game = await games.findOne({ number: request.params.id })
      const events = game.events
        .map(gameEventToPublicDto)
        .filter((e): e is NonNullable<typeof e> => e !== null)

      return reply
        .type('application/hal+json')
        .status(200)
        .send({
          _links: {
            self: { href: `/api/v1/games/${game.number}/events` },
            game: { href: `/api/v1/games/${game.number}` },
          },
          _embedded: { events },
        })
    },
  )
})
```

**Step 2: Manually verify**

```bash
curl http://localhost:3000/api/v1/games/1/events/
# Expected: _embedded.events array with public event types
# Verify: no gameServerAssignmentFailed or gameServerReinitializationOrdered events
# Verify: substituteRequested has gameClass but no player/actor fields
```

**Step 3: Commit**

```bash
git add "src/routes/api/v1/games/:id/events/index.ts"
git commit -m "feat(api): add GET /api/v1/games/:id/events"
```

---

## Task 12: Queue endpoint

**Files:**

- Create: `src/routes/api/v1/queue/index.ts`

The queue state, slots, and map vote results come from three collections. Queue config comes from environment.

**Step 1: Create the file**

```typescript
// src/routes/api/v1/queue/index.ts
import { routes } from '../../../../utils/routes'
import { getState } from '../../../../queue/get-state'
import { getSlots } from '../../../../queue/get-slots'
import { collections } from '../../../../database/collections'
import { queueConfigs } from '../../../../queue/configs'
import { environment } from '../../../../environment'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    const [state, slots, mapOptions] = await Promise.all([
      getState(),
      getSlots(),
      collections.queueMapOptions.find().toArray(),
    ])

    const config = queueConfigs[environment.QUEUE_CONFIG]

    const mapVoteResults: Record<string, number> = Object.fromEntries(
      mapOptions.map(o => [o.map, o.votes]),
    )

    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        state,
        config: {
          teamCount: config.teamCount,
          classes: config.classes.map(c => ({
            name: c.name,
            count: c.count,
            ...(c.canMakeFriendsWith ? { canMakeFriendsWith: c.canMakeFriendsWith } : {}),
          })),
        },
        slots: slots.map(slot => ({
          id: slot.id,
          gameClass: slot.gameClass,
          player: slot.player
            ? {
                steamId: slot.player.steamId,
                name: slot.player.name,
                avatarUrl: slot.player.avatarUrl,
              }
            : null,
          ready: slot.ready,
        })),
        mapVoteResults,
        _links: { self: { href: '/api/v1/queue' } },
      })
  })
})
```

**Step 2: Manually verify**

```bash
curl http://localhost:3000/api/v1/queue/
# Expected: state, config (teamCount, classes), slots, mapVoteResults, _links
```

**Step 3: Commit**

```bash
git add src/routes/api/v1/queue/index.ts
git commit -m "feat(api): add GET /api/v1/queue"
```

---

## Task 13: Online players endpoint

**Files:**

- Create: `src/routes/api/v1/online-players/index.ts`

**Step 1: Create the file**

```typescript
// src/routes/api/v1/online-players/index.ts
import { routes } from '../../../../utils/routes'
import { collections } from '../../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    const players = await collections.onlinePlayers.find().toArray()

    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        count: players.length,
        _links: { self: { href: '/api/v1/online-players' } },
        _embedded: {
          players: players.map(p => ({
            steamId: p.steamId,
            name: p.name,
            avatar: p.avatar,
            _links: { self: { href: `/api/v1/players/${p.steamId}` } },
          })),
        },
      })
  })
})
```

**Step 2: Manually verify**

```bash
curl http://localhost:3000/api/v1/online-players/
# Expected: { count: N, _embedded: { players: [...] }, _links: { self: ... } }
```

**Step 3: Commit**

```bash
git add src/routes/api/v1/online-players/index.ts
git commit -m "feat(api): add GET /api/v1/online-players"
```

---

## Task 14: Write API documentation

**Files:**

- Create: `docs/api/README.md`

**Step 1: Create docs directory and file**

```bash
mkdir -p docs/api
```

Write `docs/api/README.md` with the full API documentation (see design doc `docs/plans/2026-03-04-public-api-design.md` for all schemas — copy and adapt to user-facing format covering each endpoint, its query params, example request, and example response).

The documentation should cover:

1. Introduction (base URL, authentication, content type, HAL format, pagination)
2. Each endpoint with:
   - Method + URL
   - Description
   - Query parameters (where applicable)
   - Example request (`curl`)
   - Example response (JSON)
3. Error responses section

**Step 2: Commit**

```bash
git add docs/api/README.md
git commit -m "docs(api): add public API documentation"
```

---

## Task 15: Run full test suite

**Step 1: Run all unit tests**

```bash
pnpm test
# Expected: all tests pass, including new DTO tests
```

**Step 2: Run lint**

```bash
pnpm lint
# Expected: no errors
```

**Step 3: Format**

```bash
pnpm format
# Fix any formatting issues, then commit if needed
```

---

## Notes

- The `games/:id` directory uses `:id` as the dynamic segment, matching the URL `GET /api/v1/games/:id`. The param name in route files is `id`, validated with `games.schemas.gameNumber` (coerces to `GameNumber`).
- The `players/:steamId` directory uses `:steamId`. Validated with `steamId64` schema.
- All response `Date` fields are serialized as ISO 8601 strings via `.toISOString()` in the mappers.
- The `errors.notFound('...')` from `src/errors.ts` (uses `@fastify/sensible`) throws an HTTP error that the global error handler catches and formats as JSON when `Accept: application/json` or `application/hal+json` is sent.
- The `/* eslint-disable-next-line @typescript-eslint/require-await */` comment is needed on routes that have no `await` in the outer async function body (consistent with existing route files).
- Quote file paths containing `:` when using `git add` (e.g., `git add "src/routes/api/v1/games/:id/index.ts"`).
