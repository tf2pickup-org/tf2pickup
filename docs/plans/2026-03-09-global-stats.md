# Global Stats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three numeric stat cards (total games played, players with ≥1 game, total game time in hours) to the top of the `/statistics` page.

**Architecture:** A new `stats` MongoDB collection holds one singleton document `{ _id: 'total', totalDurationMs }`. A plugin increments the counter whenever a game ends normally. A migration backfills the total from existing ended games. Three DB queries (two `countDocuments` on existing collections, one `findOne` on the new collection) run in parallel inside a new JSX component rendered above the charts.

**Tech Stack:** Fastify plugin, MongoDB raw driver, @kitajs/html JSX, Vitest

---

### Task 1: Add StatsModel and register the collection

**Files:**

- Create: `src/database/models/stats.model.ts`
- Modify: `src/database/collections.ts`

**Step 1: Create the model file**

```ts
// src/database/models/stats.model.ts
export interface StatsModel {
  totalDurationMs: number
}
```

**Step 2: Register the collection**

In `src/database/collections.ts`, add the import and collection entry (keep alphabetical order):

```ts
import type { StatsModel } from './models/stats.model'
```

In the `collections` object:

```ts
stats: database.collection<StatsModel>('stats'),
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors

**Step 4: Commit**

```bash
git add src/database/models/stats.model.ts src/database/collections.ts
git commit -m "feat: add stats collection model and registration"
```

---

### Task 2: Create the update-game-stats plugin

This plugin listens to `game:ended` (which fires for both ended and interrupted games) and only processes games with `state === GameState.ended`. It finds the `gameStarted` and `gameEnded` events in `game.events` to compute the duration, then `$inc`s `totalDurationMs`.

**Files:**

- Create: `src/statistics/plugins/update-game-stats.ts`
- Create: `src/statistics/plugins/update-game-stats.test.ts`

**Step 1: Write the failing test**

```ts
// src/statistics/plugins/update-game-stats.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: {
    on: vi.fn(),
  },
}))

vi.mock('../../database/collections', () => ({
  collections: {
    stats: { updateOne: vi.fn() },
  },
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

import { events } from '../../events'
import { collections } from '../../database/collections'
import plugin from './update-game-stats'
import { GameState, type GameModel } from '../../database/models/game.model'
import { GameEventType } from '../../database/models/game-event.model'

describe('update-game-stats', () => {
  let gameEndedHandler: (params: { game: GameModel }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(collections.stats.updateOne).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()
    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'game:ended')
    gameEndedHandler = call![1] as typeof gameEndedHandler
  })

  it('increments totalDurationMs by game duration for ended games', async () => {
    const startedAt = new Date('2024-01-01T10:00:00Z')
    const endedAt = new Date('2024-01-01T11:00:00Z') // 3_600_000 ms

    const game = {
      state: GameState.ended,
      events: [
        { event: GameEventType.gameCreated, at: new Date('2024-01-01T09:50:00Z') },
        { event: GameEventType.gameStarted, at: startedAt },
        { event: GameEventType.gameEnded, at: endedAt, reason: 'match ended' },
      ],
    } as unknown as GameModel

    await gameEndedHandler({ game })

    expect(collections.stats.updateOne).toHaveBeenCalledWith(
      { _id: 'total' },
      { $inc: { totalDurationMs: 3_600_000 } },
      { upsert: true },
    )
  })

  it('ignores interrupted games', async () => {
    const game = {
      state: GameState.interrupted,
      events: [],
    } as unknown as GameModel

    await gameEndedHandler({ game })

    expect(collections.stats.updateOne).not.toHaveBeenCalled()
  })

  it('skips games without a gameStarted event', async () => {
    const game = {
      state: GameState.ended,
      events: [{ event: GameEventType.gameEnded, at: new Date(), reason: 'match ended' }],
    } as unknown as GameModel

    await gameEndedHandler({ game })

    expect(collections.stats.updateOne).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- src/statistics/plugins/update-game-stats.test.ts
```

Expected: FAIL — "Cannot find module './update-game-stats'"

**Step 3: Write the implementation**

```ts
// src/statistics/plugins/update-game-stats.ts
import fp from 'fastify-plugin'
import { events } from '../../events'
import { GameState } from '../../database/models/game.model'
import { GameEventType } from '../../database/models/game-event.model'
import { collections } from '../../database/collections'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        if (game.state !== GameState.ended) {
          return
        }

        const startedEvent = game.events.find(e => e.event === GameEventType.gameStarted)
        const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

        if (!startedEvent || !endedEvent) {
          return
        }

        const durationMs = endedEvent.at.getTime() - startedEvent.at.getTime()

        await collections.stats.updateOne(
          { _id: 'total' } as object,
          { $inc: { totalDurationMs: durationMs } },
          { upsert: true },
        )
      }),
    )
  },
)
```

Note: `{ _id: 'total' } as object` is needed because the TypeScript driver infers `_id` as `ObjectId` by default; the cast satisfies the type checker without changing runtime behaviour.

**Step 4: Run test to verify it passes**

```bash
pnpm test -- src/statistics/plugins/update-game-stats.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/statistics/plugins/update-game-stats.ts src/statistics/plugins/update-game-stats.test.ts
git commit -m "feat: add update-game-stats plugin to track total game duration"
```

---

### Task 3: Create migration 019-add-stats.ts

Backfills `totalDurationMs` from all existing `GameState.ended` games by iterating their events.

**Files:**

- Create: `src/migrations/019-add-stats.ts`

No unit test — migrations run once and are verified by running them against the DB.

**Step 1: Write the migration**

```ts
// src/migrations/019-add-stats.ts
import { collections } from '../database/collections'
import { logger } from '../logger'
import { GameState } from '../database/models/game.model'
import { GameEventType } from '../database/models/game-event.model'

export async function up() {
  const games = await collections.games.find({ state: GameState.ended }).toArray()

  let totalDurationMs = 0
  let counted = 0

  for (const game of games) {
    const startedEvent = game.events.find(e => e.event === GameEventType.gameStarted)
    const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

    if (!startedEvent || !endedEvent) {
      continue
    }

    totalDurationMs += endedEvent.at.getTime() - startedEvent.at.getTime()
    counted++
  }

  await collections.stats.updateOne(
    { _id: 'total' } as object,
    { $inc: { totalDurationMs } },
    { upsert: true },
  )

  logger.info(`backfilled game durations from ${counted} games (total: ${totalDurationMs}ms)`)
}
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/migrations/019-add-stats.ts
git commit -m "feat: add migration to backfill total game duration stats"
```

---

### Task 4: Create the GlobalStats component

Async JSX component that fetches all three stats in parallel and renders three cards.

**Files:**

- Create: `src/statistics/views/html/global-stats.tsx`

**Step 1: Write the component**

```tsx
// src/statistics/views/html/global-stats.tsx
import { collections } from '../../../database/collections'
import { GameState } from '../../../database/models/game.model'

export async function GlobalStats() {
  const [totalGames, playersWithGames, statsDoc] = await Promise.all([
    collections.games.countDocuments({ state: GameState.ended }),
    collections.players.countDocuments({ 'stats.totalGames': { $gt: 0 } }),
    collections.stats.findOne({ _id: 'total' } as object),
  ])

  const totalHours = Math.floor((statsDoc?.totalDurationMs ?? 0) / 3_600_000)

  return (
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
      <StatCard value={totalGames.toLocaleString()} label="games played" />
      <StatCard value={playersWithGames.toLocaleString()} label="players" />
      <StatCard value={`${totalHours.toLocaleString()}h`} label="total game time" />
    </div>
  )
}

function StatCard(props: { value: string; label: string }) {
  return (
    <div class="bg-abru-dark-25 flex flex-col gap-1 rounded-lg px-6 py-8">
      <span class="text-abru-light-75 text-[40px] leading-none font-bold">{props.value}</span>
      <span class="text-abru-light-50 text-sm tracking-wide uppercase">{props.label}</span>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/statistics/views/html/global-stats.tsx
git commit -m "feat: add GlobalStats component with total games, players and game time"
```

---

### Task 5: Wire GlobalStats into StatisticsPage

**Files:**

- Modify: `src/statistics/views/html/statistics.page.tsx`

**Step 1: Add the import and render the component**

In `statistics.page.tsx`, add the import:

```ts
import { GlobalStats } from './global-stats'
```

In the JSX, insert `<GlobalStats />` between the title `div` and the first chart card. The full updated `div.container` content:

```tsx
<div class="container mx-auto grid grid-cols-1 gap-4 px-2 lg:grid-cols-2">
  <div class="lg:col-span-2">
    <div class="text-abru-light-75 my-9 text-[48px] font-bold capitalize">Statistics</div>
  </div>

  <GlobalStats />

  <div class="bg-abru-dark-25 rounded-lg px-12 py-8 lg:row-span-2">
    <PlayedMapsCount />
  </div>

  <div class="bg-abru-dark-25 rounded-lg px-6 py-8">
    <GameLaunchTimeSpans />
  </div>

  <div class="bg-abru-dark-25 rounded-lg px-6 py-8">
    <GameLaunchesPerDay span={props.span} />
  </div>
</div>
```

**Step 2: Start the dev server and verify visually**

```bash
docker-compose up -d mongo
pnpm dev
```

Open `http://localhost:3000/statistics` (or whatever `WEBSITE_URL` is set to) and confirm:

- Three stat cards appear above the charts
- Numbers are correct (total games should match the games count in the DB)

**Step 3: Run all tests**

```bash
pnpm test
```

Expected: all passing

**Step 4: Commit**

```bash
git add src/statistics/views/html/statistics.page.tsx
git commit -m "feat: display global stats cards on statistics page"
```
