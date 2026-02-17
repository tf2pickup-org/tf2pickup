# Player Action Logs — Pagination, Sorting & Filtering

## Problem

The player action logs table loads slowly (N+1 player lookups per row), uses infinite scroll with no way to jump to a specific point, and lacks filtering or sorting.

## Solution

Server-side filtering, sorting, and numbered pagination using HTMX partial swaps — following the existing game list pattern.

## Database

### New indexes (migration)

- `{ timestamp: -1 }` — default sort
- `{ player: 1, timestamp: -1 }` — player-filtered queries
- `{ action: 1, timestamp: -1 }` — action-type-filtered queries

### Query changes (`get-logs.ts`)

Accepts: `page`, `sortOrder` (asc/desc), `actionFilter`, `playerFilter`.
Returns: `{ logs, totalCount }`.
Uses `skip/limit` pagination.

### Batch player lookups

Fetch all players for the page in one `$in` query instead of per-row `bySteamId()`.

## Routes

Merge the two routes (page + batch) into a single `/admin/player-action-logs` route with query params: `page`, `sort`, `action`, `player`.

- Full page on normal request
- Table body + pagination partial on HTMX request (`hx-request` header)
- Remove `/batch` route

## UI

### Filter bar (above table)

- Action type `<select>`: All | Went online | Connected to gameserver | Said (chat)
- Player search `<input>`: debounced with `hx-trigger="keyup changed delay:300ms"`

### Sortable date column

Click toggles asc/desc, arrow indicator shows direction.

### Pagination

Reuse existing `paginate()` + `<Pagination>` component from `src/html/components/pagination.tsx`.

### HTMX wiring

Filter controls and pagination links target a wrapper div, swapping table rows + pagination together. Filter changes reset to page 1.

## Files affected

- `src/migrations/013-player-actions-indexes.ts` (new)
- `src/admin/player-action-logs/get-logs.ts` (rewrite)
- `src/routes/admin/player-action-logs/index.ts` (rewrite)
- `src/routes/admin/player-action-logs/batch/index.ts` (delete)
- `src/admin/player-action-logs/views/html/player-action-logs.page.tsx` (rewrite)
- `src/admin/player-action-logs/views/html/log-entry-list.tsx` (rewrite)
