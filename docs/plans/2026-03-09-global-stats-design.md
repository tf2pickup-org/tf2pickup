# Global Stats on Statistics Page

**Date:** 2026-03-09

## Overview

Add three numeric stat cards at the top of the `/statistics` page:

- **Total games played** (excluding interrupted games)
- **Players with at least one game**
- **Total game time** (in whole hours)

## Design Decisions

- Stats displayed as a row of cards above the existing charts.
- Total game time is stored pre-computed in a new `stats` collection (not derived via aggregation at read time), using a single counter document `{ _id: 'total', totalDurationMs: number }`. The collection is named generically so other stats can be added later.
- Game duration = time from `gameStarted` event to `gameEnded` event (actual play time, not setup time).
- Total game time formatted as whole hours, e.g. `1,234h`.

## Data Layer

### New collection: `stats`

Single document:

```ts
{ _id: 'total', totalDurationMs: number }
```

- Model: `src/database/models/stats.model.ts`
- Registered in `src/database/collections.ts`

### New plugin: `src/statistics/plugins/update-game-stats.ts`

Listens to `game:ended`. For games with `state === GameState.ended`, finds the `gameStarted` and `gameEnded` events in `game.events`, computes `durationMs`, and `$inc`s `totalDurationMs` on the counter document (upsert: true).

### New migration: `019-add-stats.ts`

Iterates all `GameState.ended` games, sums durations, writes total into the `stats` counter.

## View Layer

### New component: `src/statistics/views/html/global-stats.tsx`

Async JSX component. Runs in parallel:

1. `games.countDocuments({ state: GameState.ended })` → total games
2. `players.countDocuments({ 'stats.totalGames': { $gt: 0 } })` → players with ≥1 game
3. `stats.findOne({ _id: 'total' })` → convert `totalDurationMs` to `Math.floor(ms / 3_600_000)`

Renders 3 stat cards using `bg-abru-dark-25 rounded-lg` card style.

### Updated: `src/statistics/views/html/statistics.page.tsx`

Add `<GlobalStats />` as a `col-span-2` block between the page title and the existing charts.
