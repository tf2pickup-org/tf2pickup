# Player Action Logs Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace infinite-scroll player action logs with paginated, sortable, filterable table using server-side queries and HTMX partial swaps.

**Architecture:** Server-side filtering/sorting/pagination following the game list pattern (`src/routes/games/index.tsx` + `src/games/views/html/game-list.page.tsx`). HTMX swaps the table body + pagination on filter/sort/page changes. Batch player lookups eliminate N+1 queries.

**Tech Stack:** Fastify routes with Zod validation, MongoDB queries with skip/limit, @kitajs/html JSX views, HTMX for partial updates, existing `Pagination` component.

---

### Task 1: Add MongoDB indexes via migration

**Files:**
- Create: `src/migrations/015-player-actions-indexes.ts`

Note: migration numbering — existing migrations go up to `014-*`. Use `015`.

**Step 1: Create the migration file**

```ts
import { collections } from '../database/collections'

export async function up() {
  await collections.playerActions.createIndex({ timestamp: -1 })
  await collections.playerActions.createIndex({ player: 1, timestamp: -1 })
  await collections.playerActions.createIndex({ action: 1, timestamp: -1 })
}
```

**Step 2: Verify the migration file compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/migrations/015-player-actions-indexes.ts
git commit -m "feat(player-action-logs): add indexes for filtering and sorting"
```

---

### Task 2: Rewrite `get-logs.ts` with pagination, sorting, and filtering

**Files:**
- Modify: `src/admin/player-action-logs/get-logs.ts`

**Step 1: Rewrite `get-logs.ts`**

Replace the entire file with a function that accepts `{ page, sortOrder, actionFilter, playerSteamIds }` and returns `{ logs, totalCount }`. The function builds a MongoDB `Filter<PlayerActionEntryModel>` based on the params:

- `actionFilter` — use regex prefix match: `{ action: { $regex: `^${actionFilter}` } }`
  - Values: `"went online"`, `"connected to gameserver"`, `"said"`
- `playerSteamIds` — `{ player: { $in: playerSteamIds } }`
- Uses `skip/limit` with configurable `itemsPerPage = 20`
- Sort by `{ timestamp: sortOrder === 'asc' ? 1 : -1 }`
- Returns both the logs array and `totalCount` from `countDocuments(filter)` for pagination

The function signature:

```ts
interface GetLogsParams {
  page: number
  sortOrder: 'asc' | 'desc'
  actionFilter?: string
  playerSteamIds?: SteamId64[]
}

interface GetLogsResult {
  logs: PlayerActionEntryModel[]
  totalCount: number
}

export const logsPerPage = 20

export async function getLogs(params: GetLogsParams): Promise<GetLogsResult>
```

**Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: Compilation errors in files that call `getLogs` with old signature — that's expected, we'll fix those next.

**Step 3: Commit**

```bash
git add src/admin/player-action-logs/get-logs.ts
git commit -m "feat(player-action-logs): rewrite getLogs with pagination, sorting, filtering"
```

---

### Task 3: Create player lookup helper

**Files:**
- Create: `src/admin/player-action-logs/get-players-by-name.ts`

This helper searches players by name substring (case-insensitive) and returns their steamIds. Used by the route when the player filter is a name rather than a steamId.

**Step 1: Create the file**

```ts
import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function getPlayersByName(name: string): Promise<SteamId64[]> {
  const players = await collections.players
    .find(
      { name: { $regex: name, $options: 'i' } },
      { projection: { steamId: 1 }, limit: 100 },
    )
    .toArray()
  return players.map(p => p.steamId)
}
```

**Step 2: Create batch player fetch helper**

Create: `src/admin/player-action-logs/get-players-for-logs.ts`

This fetches player names for a batch of logs in one query (solving N+1).

```ts
import { collections } from '../../database/collections'
import type { PlayerActionEntryModel } from '../../database/models/player-action-entry.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function getPlayersForLogs(
  logs: PlayerActionEntryModel[],
): Promise<Map<SteamId64, string>> {
  const steamIds = [...new Set(logs.map(l => l.player))]
  const players = await collections.players
    .find(
      { steamId: { $in: steamIds } },
      { projection: { steamId: 1, name: 1 } },
    )
    .toArray()
  return new Map(players.map(p => [p.steamId, p.name]))
}
```

**Step 3: Verify compilation**

Run: `pnpm exec tsc --noEmit`
Expected: Still errors from old `getLogs` callers — that's OK.

**Step 4: Commit**

```bash
git add src/admin/player-action-logs/get-players-by-name.ts src/admin/player-action-logs/get-players-for-logs.ts
git commit -m "feat(player-action-logs): add player lookup helpers for batch fetch and name search"
```

---

### Task 4: Rewrite the views

**Files:**
- Modify: `src/admin/player-action-logs/views/html/player-action-logs.page.tsx`
- Modify: `src/admin/player-action-logs/views/html/log-entry-list.tsx`

**Step 1: Rewrite `log-entry-list.tsx`**

This component now receives pre-fetched player names (a `Map<SteamId64, string>`) instead of doing per-row lookups. It also receives pagination data and current filter/sort state for building URLs.

Key changes:
- `LogEntryList` is no longer async — it receives `logs`, `playerNames`, pagination props, and filter state
- Remove the infinite scroll `hx-trigger="intersect once"` row
- Add `Pagination` component at the bottom
- Each row uses `playerNames.get(action.player)` instead of `await players.bySteamId()`

The component should render:
- The table rows (same columns: Date, Name, SteamId, IP, User agent, Action)
- The `Pagination` component with `hrefFn` that preserves current filter/sort params

URL format for pagination links: `/admin/player-action-logs?page=N&sort=SORT&action=ACTION&player=PLAYER`

**Step 2: Rewrite `player-action-logs.page.tsx`**

This page now:
- Accepts props for current state: `{ page, sort, action, player, logs, totalCount, playerNames }`
- Renders a filter bar above the table with:
  - A `<select>` for action type with `hx-get` that targets `#log-results` and includes all filter params
  - A text `<input>` for player search with `hx-get`, `hx-trigger="keyup changed delay:300ms"`, targeting `#log-results`
  - Both include `hx-include` to send sibling input values
- The date column header `<th>` is a clickable link that toggles sort direction (shows arrow up/down icon)
- The table body + pagination are wrapped in `<div id="log-results">` for HTMX targeting
- Uses `name` attributes on form controls so HTMX sends them as query params

The filter bar and table should be inside a `<form>` or use `hx-include` to gather values from sibling inputs. Use `hx-vals='{"page": "1"}'` on filter controls to reset to page 1 when filters change.

**Step 3: Verify compilation**

Run: `pnpm exec tsc --noEmit`
Expected: Errors in routes that pass wrong props — will fix in next task.

**Step 4: Commit**

```bash
git add src/admin/player-action-logs/views/html/log-entry-list.tsx src/admin/player-action-logs/views/html/player-action-logs.page.tsx
git commit -m "feat(player-action-logs): rewrite views with pagination, filtering, sorting UI"
```

---

### Task 5: Rewrite the route and delete batch route

**Files:**
- Modify: `src/routes/admin/player-action-logs/index.ts`
- Delete: `src/routes/admin/player-action-logs/batch/index.ts`

**Step 1: Rewrite the main route**

The route at `/admin/player-action-logs` accepts query params:
- `page` (number, default 1)
- `sort` (`asc` | `desc`, default `desc`)
- `action` (string, optional — one of `went online`, `connected to gameserver`, `said`)
- `player` (string, optional — name or steamId to search)

Schema:

```ts
schema: {
  querystring: z.object({
    page: z.coerce.number().optional(),
    sort: z.enum(['asc', 'desc']).optional(),
    action: z.string().optional(),
    player: z.string().optional(),
  }),
},
```

The handler:
1. Resolves `player` filter: if it looks like a SteamId64 (17 digits), use it directly. Otherwise call `getPlayersByName()` to get matching steamIds.
2. Calls `getLogs()` with resolved params
3. Calls `getPlayersForLogs()` to batch-fetch player names
4. If `request.isPartialFor('log-results')` — return just the `LogEntryList` partial (table rows + pagination)
5. Otherwise — return full `PlayerActionLogsPage`

Follow the pattern from `src/routes/games/index.tsx` for the HTMX partial vs full page branching.

**Step 2: Delete the batch route**

Delete `src/routes/admin/player-action-logs/batch/index.ts` (and the `batch/` directory).

**Step 3: Verify full compilation**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — all errors should be resolved now.

**Step 4: Run lint**

Run: `pnpm lint`
Fix any issues.

**Step 5: Commit**

```bash
git rm src/routes/admin/player-action-logs/batch/index.ts
git add src/routes/admin/player-action-logs/index.ts
git commit -m "feat(player-action-logs): rewrite route with filtering, sorting, pagination; remove batch route"
```

---

### Task 6: Manual testing and polish

**Step 1: Start the dev server**

Run: `pnpm dev`

**Step 2: Test in browser**

Navigate to the player action logs admin page and verify:
- Table loads with pagination (no infinite scroll)
- Page navigation works
- Action type filter works and resets to page 1
- Player search works (by name and by steamId) and resets to page 1
- Date sort toggle works (asc/desc with arrow indicator)
- All filter/sort/page state is reflected in query params (bookmarkable)

**Step 3: Fix any issues found during testing**

**Step 4: Final commit if fixes were needed**
