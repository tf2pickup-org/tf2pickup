# tf2pickup.org Public API

## Introduction

The tf2pickup.org public API provides read-only access to player profiles, game history, live queue state, and application metadata. It is designed for third-party dashboards, bots, and integrations.

**Base URL:** `{WEBSITE_URL}/api/v1/`

- No authentication is required.
- All endpoints are `GET` only.
- All responses use the `application/hal+json` content type.
- Dates are ISO 8601 UTC strings (e.g. `"2024-01-01T00:00:00.000Z"`).
- All `/api/` responses include the `Access-Control-Allow-Origin: *` header, allowing cross-origin requests from any domain.

---

## HAL Format

All responses follow the [HAL (Hypertext Application Language)](https://stateless.group/hal_specification.html) format.

- **`_links`** — an object containing named hypermedia links. Each link has at minimum an `href` property. `self` always points to the current resource.
- **`_embedded`** — an object containing related resources embedded inline in the response. Used in list endpoints to embed item arrays.

Example:

```json
{
  "_links": {
    "self": { "href": "/api/v1/players" },
    "next": { "href": "/api/v1/players?offset=20&limit=20" }
  },
  "_embedded": {
    "players": []
  }
}
```

---

## Pagination

List endpoints support offset-based pagination via query parameters.

| Parameter | Type    | Default | Max   | Description                       |
| --------- | ------- | ------- | ----- | --------------------------------- |
| `offset`  | integer | `0`     | —     | Number of items to skip           |
| `limit`   | integer | `20`    | `100` | Maximum number of items to return |

Paginated responses include:

- `total` — total number of matching items
- `offset` — the current offset
- `limit` — the current limit
- `_links.next` — link to the next page (omitted on the last page)
- `_links.prev` — link to the previous page (omitted when `offset === 0`)

---

## Endpoints

### GET /api/v1/

Returns links to all top-level resources. Use this as the entry point to discover available endpoints.

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/
```

**Example response:**

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

---

### GET /api/v1/version

Returns the current application version string.

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/version
```

**Example response:**

```json
{
  "version": "4.0.0-rc.4",
  "_links": {
    "self": { "href": "/api/v1/version" }
  }
}
```

---

### GET /api/v1/players

Returns a paginated list of registered players, sorted by join date descending (newest first).

**Query parameters:**

| Parameter | Type    | Default | Max   | Description             |
| --------- | ------- | ------- | ----- | ----------------------- |
| `offset`  | integer | `0`     | —     | Number of items to skip |
| `limit`   | integer | `20`    | `100` | Items per page          |

**Example request:**

```bash
curl "https://tf2pickup.example.com/api/v1/players?offset=0&limit=20"
```

**Example response:**

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
      {
        "steamId": "76561198012345678",
        "name": "PlayerName",
        "joinedAt": "2024-01-01T00:00:00.000Z",
        "avatar": {
          "small": "https://avatars.steamstatic.com/abc_34.jpg",
          "medium": "https://avatars.steamstatic.com/abc_64.jpg",
          "large": "https://avatars.steamstatic.com/abc_full.jpg"
        },
        "roles": [],
        "stats": {
          "totalGames": 42,
          "gamesByClass": { "soldier": 30, "scout": 12 }
        },
        "etf2lProfileId": 12345,
        "twitchTvProfileUrl": "https://www.twitch.tv/somestreamer",
        "activeGame": null,
        "_links": {
          "self": { "href": "/api/v1/players/76561198012345678" },
          "games": { "href": "/api/v1/players/76561198012345678/games" }
        }
      }
      // ...
    ]
  }
}
```

---

### GET /api/v1/players/:steamId

Returns a single player by their Steam ID 64.

**Path parameters:**

| Parameter | Description                   |
| --------- | ----------------------------- |
| `steamId` | Steam ID 64 (17-digit number) |

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/players/76561198012345678
```

**Example response:**

```json
{
  "steamId": "76561198012345678",
  "name": "PlayerName",
  "joinedAt": "2024-01-01T00:00:00.000Z",
  "avatar": {
    "small": "https://avatars.steamstatic.com/abc_34.jpg",
    "medium": "https://avatars.steamstatic.com/abc_64.jpg",
    "large": "https://avatars.steamstatic.com/abc_full.jpg"
  },
  "roles": [],
  "stats": {
    "totalGames": 42,
    "gamesByClass": { "soldier": 30, "scout": 12 }
  },
  "etf2lProfileId": 12345,
  "twitchTvProfileUrl": "https://www.twitch.tv/somestreamer",
  "activeGame": 1234,
  "_links": {
    "self": { "href": "/api/v1/players/76561198012345678" },
    "games": { "href": "/api/v1/players/76561198012345678/games" }
  }
}
```

**Field notes:**

- `roles` — `[]` for regular players; possible values are `"admin"` and `"super user"`.
- `etf2lProfileId` — ETF2L profile ID, or `null` if no ETF2L profile is linked.
- `twitchTvProfileUrl` — Twitch channel URL, or `null` if no Twitch profile is linked.
- `activeGame` — game number of the player's current active game, or `null` if not in a game.

---

### GET /api/v1/players/:steamId/games

Returns a paginated list of games that the given player participated in, sorted by game number descending (most recent first).

**Path parameters:**

| Parameter | Description                   |
| --------- | ----------------------------- |
| `steamId` | Steam ID 64 (17-digit number) |

**Query parameters:**

| Parameter | Type    | Default | Max   | Description             |
| --------- | ------- | ------- | ----- | ----------------------- |
| `offset`  | integer | `0`     | —     | Number of items to skip |
| `limit`   | integer | `10`    | `100` | Items per page          |

**Example request:**

```bash
curl "https://tf2pickup.example.com/api/v1/players/76561198012345678/games?offset=0&limit=10"
```

**Example response:**

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
      {
        "id": 1234,
        "map": "cp_process_final",
        "state": "ended",
        "score": { "red": 3, "blu": 2 },
        "logsUrl": "https://logs.tf/12345",
        "demoUrl": "https://demos.tf/12345",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "endedAt": "2024-01-01T01:00:00.000Z",
        "gameServer": { "name": "EU #1", "provider": "static" },
        "_links": {
          "self": { "href": "/api/v1/games/1234" },
          "slots": { "href": "/api/v1/games/1234/slots" },
          "events": { "href": "/api/v1/games/1234/events" }
        }
      }
      // ...
    ]
  }
}
```

---

### GET /api/v1/games

Returns a paginated list of games, sorted by game number descending (most recent first).

**Query parameters:**

| Parameter | Type    | Default | Max   | Description                                                                                            |
| --------- | ------- | ------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `offset`  | integer | `0`     | —     | Number of items to skip                                                                                |
| `limit`   | integer | `20`    | `100` | Items per page                                                                                         |
| `state`   | string  | —       | —     | Filter by game state. One of: `created`, `configuring`, `launching`, `started`, `ended`, `interrupted` |

**Example request:**

```bash
curl "https://tf2pickup.example.com/api/v1/games?offset=0&limit=20&state=ended"
```

**Example response:**

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
      {
        "id": 1234,
        "map": "cp_process_final",
        "state": "ended",
        "score": { "red": 3, "blu": 2 },
        "logsUrl": "https://logs.tf/12345",
        "demoUrl": "https://demos.tf/12345",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "endedAt": "2024-01-01T01:00:00.000Z",
        "gameServer": { "name": "EU #1", "provider": "static" },
        "_links": {
          "self": { "href": "/api/v1/games/1234" },
          "slots": { "href": "/api/v1/games/1234/slots" },
          "events": { "href": "/api/v1/games/1234/events" }
        }
      }
      // ...
    ]
  }
}
```

---

### GET /api/v1/games/:id

Returns a single game by its game number.

**Path parameters:**

| Parameter | Description           |
| --------- | --------------------- |
| `id`      | Game number (integer) |

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/games/1234
```

**Example response:**

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
  "gameServer": { "name": "EU #1", "provider": "static" },
  "_links": {
    "self": { "href": "/api/v1/games/1234" },
    "slots": { "href": "/api/v1/games/1234/slots" },
    "events": { "href": "/api/v1/games/1234/events" }
  }
}
```

**Field notes:**

- `score` — `null` for games that have not ended.
- `logsUrl` / `demoUrl` — `null` if not yet uploaded.
- `endedAt` — `null` for active games.
- `gameServer` — `null` if no server has been assigned yet.
- `state` — one of `created`, `configuring`, `launching`, `started`, `ended`, `interrupted`.

---

### GET /api/v1/games/:id/slots

Returns all player slot assignments for a game.

**Path parameters:**

| Parameter | Description           |
| --------- | --------------------- |
| `id`      | Game number (integer) |

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/games/1234/slots
```

**Example response:**

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
      // ...
    ]
  }
}
```

**Field notes:**

- `team` — `"red"` or `"blu"`.
- `status` — `"active"` or `"waiting for substitute"`.
- `connectionStatus` — `"offline"`, `"joining"`, or `"connected"`.

---

### GET /api/v1/games/:id/events

Returns the ordered event log for a game in chronological order. Internal and administrative events are excluded.

**Path parameters:**

| Parameter | Description           |
| --------- | --------------------- |
| `id`      | Game number (integer) |

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/games/1234/events
```

**Example response:**

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

**Included event types:**

| Event type                   | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `gameCreated`                | Game was created                                         |
| `gameServerAssigned`         | A game server was assigned; includes `gameServerName`    |
| `gameServerInitialized`      | Game server finished configuration                       |
| `gameStarted`                | Game became live                                         |
| `gameRestarted`              | Game server was restarted                                |
| `roundEnded`                 | A round finished; includes `winner`, `lengthMs`, `score` |
| `substituteRequested`        | A substitute was requested; includes `gameClass`, `team` |
| `playerReplaced`             | A player was substituted; includes `gameClass`           |
| `playerJoinedGameServer`     | A player connected to the game server                    |
| `playerJoinedGameServerTeam` | A player joined their assigned team on the server        |
| `playerLeftGameServer`       | A player disconnected from the game server               |
| `gameEnded`                  | Game ended; includes `reason`                            |

---

### GET /api/v1/queue

Returns the current live queue state, including slot occupancy and map vote results.

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/queue
```

**Example response:**

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
      "player": {
        "steamId": "76561198012345678",
        "name": "PlayerName",
        "avatarUrl": "https://avatars.steamstatic.com/abc_64.jpg"
      },
      "ready": true
    }
    // ...
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

**Field notes:**

- `state` — `"waiting"`, `"ready"`, or `"launching"`.
- `slots[].player` — `null` if the slot is empty.
- `mapVoteResults` — map names to vote counts. Empty object `{}` if no map vote is in progress.
- `config.classes[].canMakeFriendsWith` — optional field; present only for classes that support the friend system.

---

### GET /api/v1/online-players

Returns all players currently connected to the site.

**Example request:**

```bash
curl https://tf2pickup.example.com/api/v1/online-players
```

**Example response:**

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
        "avatar": "https://avatars.steamstatic.com/abc_64.jpg",
        "_links": {
          "self": { "href": "/api/v1/players/76561198012345678" }
        }
      }
      // ...
    ]
  }
}
```

---

## Error Responses

All errors return a standard JSON body with an HTTP status code.

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Player not found"
}
```

| Status | Error                 | Scenario                                             |
| ------ | --------------------- | ---------------------------------------------------- |
| `400`  | Bad Request           | Invalid query parameters (e.g. non-numeric `offset`) |
| `404`  | Not Found             | The requested player or game does not exist          |
| `500`  | Internal Server Error | Unexpected server error                              |
