# Public REST API Design

**Date**: 2026-03-04
**Status**: Approved

## Overview

A read-only public REST API for tf2pickup.org. No authentication required. Exposes player profiles, game history, live queue state, and app metadata. Designed to support third-party dashboards, bots, and integrations.

## Decisions

| Decision          | Choice                              | Rationale                                           |
| ----------------- | ----------------------------------- | --------------------------------------------------- |
| Base path         | `/api/v1/`                          | Clean namespace, version in URL for future-proofing |
| Hypermedia format | HAL (`_links` + `_embedded`)        | Well-understood, tooling support, minimal overhead  |
| Pagination        | Offset/limit (`?offset=0&limit=20`) | Simple, conventional                                |
| Content-Type      | `application/hal+json`              | Signals HAL semantics to clients                    |
| Auth              | None                                | Public read-only data only                          |

## Endpoint Map

```
GET /api/v1/                          Root — lists all resource links
GET /api/v1/version                   App version string
GET /api/v1/players                   Paginated player list
GET /api/v1/players/:steamId          Single player by Steam ID 64
GET /api/v1/players/:steamId/games    Games a player participated in
GET /api/v1/games                     Paginated game list, newest first
GET /api/v1/games/:id                 Single game by game number
GET /api/v1/games/:id/slots           Slots (player assignments) in a game
GET /api/v1/games/:id/events          Ordered event log for a game
GET /api/v1/queue                     Live queue state
GET /api/v1/online-players            Currently connected players
```

## Response Schemas

### Root — `GET /api/v1/`

```json
{
  "_links": {
    "self": { "href": "/api/v1" },
    "players": { "href": "/api/v1/players" },
    "games": { "href": "/api/v1/games" },
    "queue": { "href": "/api/v1/queue" },
    "onlinePlayers": { "href": "/api/v1/online-players" },
    "version": { "href": "/api/v1/version" }
  }
}
```

### Version — `GET /api/v1/version`

```json
{
  "version": "4.0.0-rc.4",
  "_links": {
    "self": { "href": "/api/v1/version" }
  }
}
```

### Players list — `GET /api/v1/players?offset=0&limit=20`

Query params: `offset` (default 0), `limit` (default 20, max 100).

```json
{
  "total": 1234,
  "offset": 0,
  "limit": 20,
  "_links": {
    "self": { "href": "/api/v1/players?offset=0&limit=20" },
    "next": { "href": "/api/v1/players?offset=20&limit=20" }
  },
  "_embedded": {
    "players": [
      /* player objects */
    ]
  }
}
```

`prev` link omitted when `offset === 0`. `next` link omitted when `offset + limit >= total`.

### Player object

Used both in list `_embedded` and as the response body for `GET /api/v1/players/:steamId`.

```json
{
  "steamId": "76561198012345678",
  "name": "PlayerName",
  "joinedAt": "2024-01-01T00:00:00.000Z",
  "avatar": {
    "small": "https://avatars.steamstatic.com/..._34.jpg",
    "medium": "https://avatars.steamstatic.com/..._64.jpg",
    "large": "https://avatars.steamstatic.com/..._full.jpg"
  },
  "roles": [],
  "stats": {
    "totalGames": 42,
    "gamesByClass": {
      "soldier": 30,
      "scout": 12
    }
  },
  "etf2lProfile": {
    "id": 12345,
    "name": "PlayerName",
    "country": "PL"
  },
  "activeGame": 1234,
  "_links": {
    "self": { "href": "/api/v1/players/76561198012345678" },
    "games": { "href": "/api/v1/players/76561198012345678/games" }
  }
}
```

**Omitted fields**: `bans`, `skill`, `skillHistory`, `preferences`, `twitchTvProfile`, `preReadyUntil`, `hasAcceptedRules`, `cooldownLevel`, `verified`, `etf2lProfileLastSyncedAt`.

`etf2lProfile` is `null` if the player has no ETF2L profile linked.
`activeGame` is `null` if the player is not in an active game.
`roles` is an empty array `[]` for regular players; values are `"admin"`, `"super user"`.

### Player's games — `GET /api/v1/players/:steamId/games?offset=0&limit=10`

Same structure as the games list (below), filtered to games where this player was in a slot.

```json
{
  "total": 42,
  "offset": 0,
  "limit": 10,
  "_links": {
    "self": { "href": "/api/v1/players/76561198012345678/games?offset=0&limit=10" },
    "next": { "href": "/api/v1/players/76561198012345678/games?offset=10&limit=10" }
  },
  "_embedded": {
    "games": [
      /* game objects */
    ]
  }
}
```

### Games list — `GET /api/v1/games?offset=0&limit=20`

Query params: `offset` (default 0), `limit` (default 20, max 100).
Optional filter: `?state=ended` — one of `created`, `configuring`, `launching`, `started`, `ended`, `interrupted`.

```json
{
  "total": 5678,
  "offset": 0,
  "limit": 20,
  "_links": {
    "self": { "href": "/api/v1/games?offset=0&limit=20" },
    "next": { "href": "/api/v1/games?offset=20&limit=20" }
  },
  "_embedded": {
    "games": [
      /* game objects */
    ]
  }
}
```

### Game object

Used both in list `_embedded` and as `GET /api/v1/games/:id` response body.

```json
{
  "id": 1234,
  "map": "cp_process_final",
  "state": "ended",
  "score": { "red": 3, "blu": 2 },
  "logsUrl": "https://logs.tf/12345",
  "demoUrl": "https://demos.tf/12345",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "endedAt": "2024-01-01T01:00:00.000Z",
  "gameServer": {
    "name": "EU #1",
    "provider": "static"
  },
  "_links": {
    "self": { "href": "/api/v1/games/1234" },
    "slots": { "href": "/api/v1/games/1234/slots" },
    "events": { "href": "/api/v1/games/1234/events" }
  }
}
```

**Omitted fields**: `connectString`, `stvConnectString`, `logSecret`, `gameServer.address`, `gameServer.port`, `gameServer.rcon`, `gameServer.logSecret`.

`score` is `null` for games that have not ended.
`logsUrl` and `demoUrl` are `null` if not yet uploaded.
`endedAt` is `null` for active games (derived from the `gameEnded` event).
`gameServer` is `null` if no server has been assigned yet.

### Game Slots — `GET /api/v1/games/:id/slots`

```json
{
  "_links": {
    "self": { "href": "/api/v1/games/1234/slots" },
    "game": { "href": "/api/v1/games/1234" }
  },
  "_embedded": {
    "slots": [
      {
        "id": "slot-0",
        "player": {
          "steamId": "76561198012345678",
          "name": "PlayerName",
          "_links": { "self": { "href": "/api/v1/players/76561198012345678" } }
        },
        "team": "red",
        "gameClass": "soldier",
        "status": "active",
        "connectionStatus": "connected"
      }
    ]
  }
}
```

**Omitted slot fields**: `skill`, `shouldJoinBy`, `voiceServerUrl`, `applyCooldown`.

`connectionStatus` values: `"offline"`, `"joining"`, `"connected"`.
`status` values: `"active"`, `"waiting for substitute"`.

### Game Events — `GET /api/v1/games/:id/events`

Returns all public events in chronological order. Internal/admin events are excluded.

```json
{
  "_links": {
    "self": { "href": "/api/v1/games/1234/events" },
    "game": { "href": "/api/v1/games/1234" }
  },
  "_embedded": {
    "events": [
      { "type": "gameCreated", "at": "2024-01-01T00:00:00.000Z" },
      { "type": "gameServerAssigned", "at": "2024-01-01T00:01:00.000Z", "gameServerName": "EU #1" },
      { "type": "gameStarted", "at": "2024-01-01T00:05:00.000Z" },
      {
        "type": "roundEnded",
        "at": "2024-01-01T00:10:00.000Z",
        "winner": "red",
        "lengthMs": 300000,
        "score": { "red": 1, "blu": 0 }
      },
      {
        "type": "substituteRequested",
        "at": "2024-01-01T00:12:00.000Z",
        "gameClass": "medic",
        "team": "blu"
      },
      { "type": "playerReplaced", "at": "2024-01-01T00:14:00.000Z", "gameClass": "medic" },
      { "type": "gameEnded", "at": "2024-01-01T01:00:00.000Z", "reason": "scored" }
    ]
  }
}
```

**Included event types**: `gameCreated`, `gameStarted`, `gameRestarted`, `gameServerAssigned`, `gameServerInitialized`, `gameEnded`, `roundEnded`, `substituteRequested`, `playerReplaced`, `playerJoinedGameServer`, `playerJoinedGameServerTeam`, `playerLeftGameServer`.

**Excluded event types**: `gameServerAssignmentFailed`, `gameServerReinitializationOrdered` (internal admin actions).

`substituteRequested` exposes `gameClass` and `team` but not actor/reason (admin info).
`playerReplaced` exposes `gameClass` but not player steamIds (to avoid exposing ban/cooldown context).

### Queue — `GET /api/v1/queue`

```json
{
  "state": "waiting",
  "config": {
    "teamCount": 2,
    "classes": [
      { "name": "scout", "count": 2 },
      { "name": "soldier", "count": 2 },
      { "name": "demoman", "count": 1 },
      { "name": "medic", "count": 1, "canMakeFriendsWith": ["scout", "soldier", "demoman"] }
    ]
  },
  "slots": [
    { "id": "0", "gameClass": "scout", "player": null, "ready": false },
    {
      "id": "1",
      "gameClass": "scout",
      "player": { "steamId": "76561198...", "name": "PlayerName", "avatarUrl": "https://..." },
      "ready": true
    },
    { "id": "2", "gameClass": "soldier", "player": null, "ready": false }
  ],
  "mapVoteResults": {
    "cp_process_final": 3,
    "cp_badlands": 1,
    "cp_metalworks": 0
  },
  "_links": {
    "self": { "href": "/api/v1/queue" }
  }
}
```

`state` values: `"waiting"`, `"ready"`, `"launching"`.
`mapVoteResults` keys are map names; values are vote counts. Empty object `{}` if no map vote is in progress.
`player` in slot is `null` if the slot is empty.

### Online Players — `GET /api/v1/online-players`

```json
{
  "count": 42,
  "_links": {
    "self": { "href": "/api/v1/online-players" }
  },
  "_embedded": {
    "players": [
      {
        "steamId": "76561198012345678",
        "name": "PlayerName",
        "avatar": "https://avatars.steamstatic.com/..._64.jpg",
        "_links": {
          "self": { "href": "/api/v1/players/76561198012345678" }
        }
      }
    ]
  }
}
```

## Error Responses

All errors return standard HTTP status codes with a JSON body:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Player not found"
}
```

| Status | Scenario                                       |
| ------ | ---------------------------------------------- |
| 400    | Invalid query params (e.g. non-numeric offset) |
| 404    | Player or game not found                       |
| 500    | Unexpected server error                        |

## Implementation Notes

- All routes live in `src/routes/api/v1/`
- Follow existing route pattern using `routes()` wrapper from `src/utils/routes.ts`
- Zod schemas for query params (pagination) and response shapes
- `endedAt` derived by finding the `gameEnded` event in `game.events`
- `createdAt` derived from the `gameCreated` event (first event in `game.events`)
- Players sorted by `joinedAt` descending in list endpoint
- Games sorted by `number` descending in list endpoint
- Player's games: query `games` collection for slots containing the given steamId, sorted by game number descending
- `canMakeFriendsWith` field on queue config classes is optional — omit if not present
- Content-Type header: `application/hal+json` for all API responses
- `CORS`: allow all origins (`*`) for API routes — needed for third-party clients

## File Structure

```
src/routes/api/
└── v1/
    ├── index.ts              # GET /api/v1/ (root)
    ├── version.ts            # GET /api/v1/version
    ├── players/
    │   ├── index.ts          # GET /api/v1/players
    │   └── :steamId/
    │       ├── index.ts      # GET /api/v1/players/:steamId
    │       └── games.ts      # GET /api/v1/players/:steamId/games
    ├── games/
    │   ├── index.ts          # GET /api/v1/games
    │   └── :id/
    │       ├── index.ts      # GET /api/v1/games/:id
    │       ├── slots.ts      # GET /api/v1/games/:id/slots
    │       └── events.ts     # GET /api/v1/games/:id/events
    ├── queue.ts              # GET /api/v1/queue
    └── online-players.ts     # GET /api/v1/online-players
```
