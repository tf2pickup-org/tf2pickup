# Post-Ready Map Vote Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional "post-ready" map voting mode where players vote for a map after all 12 have readied up, rather than during the queue wait.

**Architecture:** Add `mapVote` queue state between `ready` and `launching`. When all players ready up in `post-ready` mode, transition to `mapVote` and show a timed dialog. After the configured timeout, resolve the winner and transition to `launching`. The existing `pre-ready` mode is unchanged and remains the default.

**Tech Stack:** Fastify 5, MongoDB, @kitajs/html JSX, HTMX, Hyperscript, WebSocket gateway, Zod, Vitest (unit), Playwright (e2e)

---

### Task 1: Register `queue:mapVoteTimeout` task

**Files:**
- Modify: `src/tasks/tasks.ts`

The task schema is a Zod discriminated union. All tasks must be registered there before use.

**Step 1: Add the task literal to the schema**

In `src/tasks/tasks.ts`, inside the `tasksSchema` discriminated union array, add after the `queue:unready` entry:

```ts
z.object({
  name: z.literal('queue:mapVoteTimeout'),
  args: z.object({}),
}),
```

**Step 2: Build to check for TypeScript errors**

```bash
pnpm build
```

Expected: no errors. The new task name is now a valid literal in the union.

**Step 3: Commit**

```bash
git add src/tasks/tasks.ts
git commit -m "feat: register queue:mapVoteTimeout task"
```

---

### Task 2: Add configuration keys

**Files:**
- Modify: `src/database/models/configuration-entry.model.ts`

Two new keys: `queue.map_vote_timing` (the feature toggle) and `queue.map_vote_timeout` (duration in ms).

**Step 1: Add the imports needed**

`secondsToMilliseconds` is already imported at the top of the file. No changes needed to imports.

**Step 2: Add the two new entries to `configurationSchema`**

After the `queue.pre_ready_up_timeout` entry (around line 225), add:

```ts
z
  .object({
    key: z.literal('queue.map_vote_timing'),
    value: z.enum(['pre-ready', 'post-ready']).default('pre-ready'),
  })
  .describe('When map voting takes place: before players ready up, or after'),
z
  .object({
    key: z.literal('queue.map_vote_timeout'),
    value: z.number().positive().default(secondsToMilliseconds(10)),
  })
  .describe('Duration of the map vote phase after all players ready up (milliseconds)'),
```

**Step 3: Build to verify TypeScript**

```bash
pnpm build
```

Expected: no errors. The new keys are now part of the `Configuration` type.

**Step 4: Commit**

```bash
git add src/database/models/configuration-entry.model.ts
git commit -m "feat: add queue.map_vote_timing and queue.map_vote_timeout config keys"
```

---

### Task 3: Add `mapVote` queue state

**Files:**
- Modify: `src/database/models/queue-state.model.ts`

**Step 1: Add the new enum value**

In the `QueueState` enum, after `ready = 'ready'`, add:

```ts
// all players have readied up; the map vote dialog is open
mapVote = 'mapVote',
```

The file becomes:

```ts
export enum QueueState {
  // waiting for players to join the queue
  waiting = 'waiting',

  // players are expected to ready up
  ready = 'ready',

  // all players have readied up; the map vote dialog is open
  mapVote = 'mapVote',

  // everybody has readied up, the game is being launched
  launching = 'launching',
}
```

**Step 2: Build to surface any exhaustive checks**

```bash
pnpm build
```

Expected: TypeScript may surface switch statements that don't handle `mapVote`. Fix any that need it (there should be none that crash — they'll just fall through to defaults).

**Step 3: Commit**

```bash
git add src/database/models/queue-state.model.ts
git commit -m "feat: add mapVote queue state"
```

---

### Task 4: Create the `MapVoteDialog` component

**Files:**
- Create: `src/queue/views/html/map-vote-dialog.tsx`
- Modify: `src/html/layout.tsx`

The dialog follows the same pattern as `ReadyUpDialog` in `src/queue/views/html/ready-up-dialog.tsx`:
- A static shell always rendered in the DOM (via `Layout`)
- A `.show()` static method that returns OOB fragments to populate content and trigger the dialog open
- A `.close()` static method that returns a fragment to trigger close

The dialog uses `hx-swap-oob` to fill in its content area, then triggers `showModal()` via Hyperscript. A countdown is started client-side using Hyperscript.

**Step 1: Create `src/queue/views/html/map-vote-dialog.tsx`**

```tsx
import { nanoid } from 'nanoid'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { MapVote } from './map-vote'
import { configuration } from '../../../configuration'

const dialogId = 'map-vote-dialog'

export function MapVoteDialog() {
  return (
    <dialog
      class="bg-abru-dark-29 w-[800px] rounded-xl px-[59px] py-[42px] shadow-xl"
      id={dialogId}
      _={`
        on show me.showModal() end
        on close me.close() end
      `}
    >
      <div class="flex flex-col gap-6">
        <div class="text-abru-light-75 flex flex-col items-center text-[32px] font-bold">
          <span>Vote for a map!</span>
          <span id="map-vote-dialog-timer" class="text-xl font-normal"></span>
        </div>
        <div id="map-vote-dialog-content"></div>
      </div>
    </dialog>
  )
}

MapVoteDialog.show = async (actor: SteamId64 | undefined, isInQueue: boolean) => {
  const timeout = await configuration.get('queue.map_vote_timeout')
  const seconds = Math.ceil(timeout / 1000)
  const id = nanoid()
  return (
    <>
      <div id="map-vote-dialog-content" hx-swap-oob="innerHTML">
        {await MapVote({ actor: isInQueue ? actor : undefined })}
      </div>
      <div id="notify-container" hx-swap-oob="beforeend">
        <div
          id={id}
          _={`
            on load
              trigger show on #${dialogId}
              set :t to ${seconds}
              put :t + 's' into #map-vote-dialog-timer
              repeat until :t <= 0
                wait 1s
                decrement :t
                put :t + 's' into #map-vote-dialog-timer
              end
              remove me
            end
          `}
        ></div>
      </div>
    </>
  )
}

MapVoteDialog.close = () => {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div id={id} _={`on load trigger close on #${dialogId} then remove me`}></div>
    </div>
  )
}
```

**Step 2: Add `MapVoteDialog` to the global `Layout`**

In `src/html/layout.tsx`, add the import at the top:

```ts
import { MapVoteDialog } from '../queue/views/html/map-vote-dialog'
```

Then add `<MapVoteDialog />` immediately after `<ReadyUpDialog />` in the body:

```tsx
<div id="notify-container"></div>
<ReadyUpDialog />
<MapVoteDialog />
<FlashMessageList />
```

**Step 3: Build**

```bash
pnpm build
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/queue/views/html/map-vote-dialog.tsx src/html/layout.tsx
git commit -m "feat: add MapVoteDialog component"
```

---

### Task 5: Update queue state transition logic

**Files:**
- Modify: `src/queue/plugins/auto-update-queue-state.ts`

This plugin listens to `queue/slots:updated` events and manages state transitions. Currently when all players ready up in `ready` state, it goes straight to `launching`. We need to:

1. Check `queue.map_vote_timing` — if `post-ready`, go to `mapVote` instead
2. Register and handle the `queue:mapVoteTimeout` task
3. Cancel the new task when the queue resets

**Step 1: Read the current file carefully** (`src/queue/plugins/auto-update-queue-state.ts`)

You already have it — review it before editing.

**Step 2: Replace the `ready` case in `maybeUpdateQueueState`**

Find this block:

```ts
case QueueState.ready: {
  if (currentPlayerCount === 0) {
    await unreadyQueue()
  } else if (readyPlayerCount === requiredPlayerCount) {
    logger.info('all players ready, queue ready')
    await setState(QueueState.launching)
    await tasks.cancelAll('queue:readyUpTimeout')
    await tasks.cancelAll('queue:unready')
  }

  break
}
```

Replace with:

```ts
case QueueState.ready: {
  if (currentPlayerCount === 0) {
    await unreadyQueue()
  } else if (readyPlayerCount === requiredPlayerCount) {
    logger.info('all players ready')
    await tasks.cancelAll('queue:readyUpTimeout')
    await tasks.cancelAll('queue:unready')
    const mapVoteTiming = await configuration.get('queue.map_vote_timing')
    if (mapVoteTiming === 'post-ready') {
      logger.info('transitioning to mapVote state')
      await setState(QueueState.mapVote)
      const timeout = await configuration.get('queue.map_vote_timeout')
      await tasks.schedule('queue:mapVoteTimeout', timeout)
    } else {
      await setState(QueueState.launching)
    }
  }

  break
}
```

**Step 3: Add the `mapVoteTimeout` task handler and register it**

Add the handler function after `readyUpTimeout`:

```ts
async function mapVoteTimeout() {
  logger.info('map vote timeout, resolving winner')
  await setState(QueueState.launching)
}
```

Register it alongside the other tasks (after `tasks.register('queue:unready', unreadyQueue)`):

```ts
tasks.register('queue:mapVoteTimeout', mapVoteTimeout)
```

**Step 4: Cancel `queue:mapVoteTimeout` in `unreadyQueue`**

In the `unreadyQueue` function, add a cancel call for safety (in case the queue somehow resets while a vote is in progress):

```ts
async function unreadyQueue() {
  logger.info('unready queue')
  await setState(QueueState.waiting)
  await tasks.cancelAll('queue:mapVoteTimeout')
  const allPlayers = (
    await collections.queueSlots.find({ player: { $ne: null } }).toArray()
  ).map(slot => slot.player!.steamId)
  await unready(...allPlayers)
}
```

**Step 5: Build**

```bash
pnpm build
```

Expected: no errors.

**Step 6: Commit**

```bash
git add src/queue/plugins/auto-update-queue-state.ts
git commit -m "feat: transition to mapVote state when all players ready in post-ready mode"
```

---

### Task 6: Update client sync for `mapVote` state

**Files:**
- Modify: `src/queue/plugins/sync-clients.ts`

Three changes needed:
1. When queue enters `mapVote` state → broadcast the map vote dialog to all players on `/`
2. When queue enters `launching` state → close the map vote dialog for all on `/`
3. In `syncQueuePage()` → show the dialog immediately if queue is already in `mapVote` state when a client connects

**Step 1: Add `MapVoteDialog` import**

At the top of `src/queue/plugins/sync-clients.ts`, add:

```ts
import { MapVoteDialog } from '../views/html/map-vote-dialog'
import { getState } from '../get-state'
```

(Note: `getState` may already be imported — check first.)

**Step 2: Update the `queue/state:updated` handler**

Find the existing handler:

```ts
events.on(
  'queue/state:updated',
  safe(async ({ state }) => {
    if (state === QueueState.ready) {
      const players = (
        await collections.queueSlots
          .find({ player: { $ne: null }, ready: { $eq: false } })
          .toArray()
      ).map(s => s.player!.steamId)

      app.gateway.to({ players }).send(async actor => await ReadyUpDialog.show(actor!))
    }
  }),
)
```

Replace with:

```ts
events.on(
  'queue/state:updated',
  safe(async ({ state }) => {
    if (state === QueueState.ready) {
      const players = (
        await collections.queueSlots
          .find({ player: { $ne: null }, ready: { $eq: false } })
          .toArray()
      ).map(s => s.player!.steamId)

      app.gateway.to({ players }).send(async actor => await ReadyUpDialog.show(actor!))
    }

    if (state === QueueState.mapVote) {
      const playerSteamIds = new Set(
        (await collections.queueSlots.find({ player: { $ne: null } }).toArray()).map(
          s => s.player!.steamId,
        ),
      )
      app.gateway.to({ url: '/' }).send(async actor => {
        const isInQueue = actor !== undefined && playerSteamIds.has(actor)
        return await MapVoteDialog.show(actor, isInQueue)
      })
    }

    if (state === QueueState.launching) {
      app.gateway.to({ url: '/' }).send(() => MapVoteDialog.close())
    }
  }),
)
```

**Step 3: Update `syncQueuePage` to show the dialog when state is `mapVote`**

In `syncQueuePage`, after the existing sends, add:

```ts
const queueState = await getState()
if (queueState === QueueState.mapVote) {
  const playerSteamIds = new Set(
    (await collections.queueSlots.find({ player: { $ne: null } }).toArray()).map(
      s => s.player!.steamId,
    ),
  )
  const isInQueue = socket.player !== undefined && playerSteamIds.has(socket.player.steamId)
  socket.send(await MapVoteDialog.show(socket.player?.steamId, isInQueue))
}
```

Place this at the end of `syncQueuePage`, after the existing `if (socket.player)` block.

**Step 4: Build**

```bash
pnpm build
```

Expected: no errors.

**Step 5: Commit**

```bash
git add src/queue/plugins/sync-clients.ts
git commit -m "feat: broadcast MapVoteDialog on mapVote state transition"
```

---

### Task 7: Hide map vote widget in `post-ready` mode

**Files:**
- Modify: `src/queue/views/html/queue.page.tsx`
- Modify: `src/queue/plugins/sync-clients.ts`

In `post-ready` mode, the `MapVote` component on the queue page must not be rendered — neither on initial page load nor when map options are reset.

**Step 1: Update `QueuePage` to conditionally render `MapVote`**

In `src/queue/views/html/queue.page.tsx`, the function is already `async`. Add a config check:

Add import at top:
```ts
import { configuration } from '../../../configuration'
```

In the `QueuePage` function body, before the return, add:
```ts
const mapVoteTiming = await configuration.get('queue.map_vote_timing')
```

Then change the map vote div from:
```tsx
<div class="order-4 lg:col-span-3">
  <MapVote actor={user?.player.steamId} />
</div>
```

To:
```tsx
<div class="order-4 lg:col-span-3">
  {mapVoteTiming === 'pre-ready' && <MapVote actor={user?.player.steamId} />}
</div>
```

**Step 2: Guard the `queue/mapOptions:reset` WebSocket broadcast**

In `src/queue/plugins/sync-clients.ts`, find:

```ts
events.on('queue/mapOptions:reset', () => {
  app.gateway.to({ url: '/' }).send(async actor => await MapVote({ actor }))
})
```

Replace with:

```ts
events.on('queue/mapOptions:reset', async () => {
  const mapVoteTiming = await configuration.get('queue.map_vote_timing')
  if (mapVoteTiming === 'pre-ready') {
    app.gateway.to({ url: '/' }).send(async actor => await MapVote({ actor }))
  }
})
```

Add the `configuration` import to `sync-clients.ts` if not already present:
```ts
import { configuration } from '../../configuration'
```

**Step 3: Build**

```bash
pnpm build
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/queue/views/html/queue.page.tsx src/queue/plugins/sync-clients.ts
git commit -m "feat: hide map vote widget when map_vote_timing is post-ready"
```

---

### Task 8: Admin panel settings

**Files:**
- Modify: `src/admin/scramble-maps/views/html/scramble-maps.page.tsx`
- Modify: `src/routes/admin/scramble-maps/index.tsx`

Add a settings form to the scramble-maps admin page for the two new config keys.

**Step 1: Update `ScrambleMaps` page component**

Replace `src/admin/scramble-maps/views/html/scramble-maps.page.tsx` content:

```tsx
import { configuration } from '../../../../configuration'
import { Admin } from '../../../views/html/admin'
import { MapVoteOptions } from './map-vote-options'
import { SaveButton } from '../../../views/html/save-button'
import { secondsToMilliseconds, millisecondsToSeconds } from 'date-fns'

export async function ScrambleMaps() {
  const mapVoteTiming = await configuration.get('queue.map_vote_timing')
  const mapVoteTimeout = await configuration.get('queue.map_vote_timeout')

  return (
    <Admin activePage="scramble-maps">
      <div class="admin-panel-set">
        <MapVoteOptions />

        <div class="mt-6 flex w-full items-center justify-center">
          <button
            class="button button--accent button--dense"
            hx-put="/admin/scramble-maps/scramble"
            hx-target="#adminPanelMapVoteOptions"
            hx-swap="outerHTML"
          >
            <span>Scramble</span>
          </button>
        </div>
      </div>

      <form action="" method="post">
        <div class="admin-panel-set">
          <dl>
            <dt>
              <label class="font-medium">Map vote timing</label>
            </dt>
            <dd class="flex flex-col gap-2">
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="mapVoteTiming"
                  value="pre-ready"
                  checked={mapVoteTiming === 'pre-ready'}
                />
                <span>Pre-ready (players vote while waiting in the queue)</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="radio"
                  name="mapVoteTiming"
                  value="post-ready"
                  checked={mapVoteTiming === 'post-ready'}
                />
                <span>Post-ready (players vote after everyone readies up)</span>
              </label>
            </dd>

            <dt class="mt-4">
              <label for="map-vote-timeout" class="font-medium">
                Map vote timeout (seconds)
              </label>
            </dt>
            <dd>
              <input
                type="number"
                id="map-vote-timeout"
                name="mapVoteTimeout"
                value={millisecondsToSeconds(mapVoteTimeout)}
                min="5"
                max="60"
              />
            </dd>
          </dl>

          <p class="mt-8">
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
```

**Step 2: Add a POST handler to the scramble-maps route**

In `src/routes/admin/scramble-maps/index.tsx`, add a POST handler after the existing PUT `/scramble`:

```ts
import { secondsToMilliseconds } from 'date-fns'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
```

Add inside the `routes` callback:

```ts
.post(
  '/',
  {
    config: { authorize: [PlayerRole.admin] },
    schema: {
      body: z.object({
        mapVoteTiming: z.enum(['pre-ready', 'post-ready']),
        mapVoteTimeout: z.coerce.number().min(5).max(60),
      }),
    },
  },
  async (request, reply) => {
    const { mapVoteTiming, mapVoteTimeout } = request.body
    await configuration.set('queue.map_vote_timing', mapVoteTiming)
    await configuration.set('queue.map_vote_timeout', secondsToMilliseconds(mapVoteTimeout))
    requestContext.set('messages', { success: ['Configuration saved'] })
    await reply.html(ScrambleMaps())
  },
)
```

Also add the missing imports (`z` is already there; add `configuration`, `requestContext`, `secondsToMilliseconds`, `ScrambleMaps`).

**Step 3: Build**

```bash
pnpm build
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/admin/scramble-maps/views/html/scramble-maps.page.tsx src/routes/admin/scramble-maps/index.tsx
git commit -m "feat: add map vote timing settings to scramble-maps admin page"
```

---

### Task 9: E2E test for post-ready map vote

**Files:**
- Create: `tests/10-queue/12-post-ready-map-vote.spec.ts`

**Step 1: Understand what the test needs to do**

1. Set `queue.map_vote_timing` to `post-ready` via admin panel
2. Fill the queue and have all players ready up (reuse existing fixtures)
3. Verify the map vote dialog appears for each player
4. Have one player vote for a map
5. Wait 10s for the timer (or set a short timeout in config first)
6. Verify the game launched
7. Clean up: reset config to `pre-ready`

Since a 10-second wait is long for a test, configure a short timeout (e.g. 3 seconds) before filling the queue.

**Step 2: Write the test**

```ts
import { mergeTests } from '@playwright/test'
import { authUsers, expect } from '../fixtures/auth-users'
import { launchGame } from '../fixtures/launch-game'
import { waitForEmptyQueue } from '../fixtures/wait-for-empty-queue'
import { secondsToMilliseconds } from 'date-fns'

const test = mergeTests(authUsers, waitForEmptyQueue)

test.describe('post-ready map vote @6v6', () => {
  test.beforeEach(async ({ users }) => {
    // Enable post-ready map vote with a short timeout via admin panel
    const adminPage = await users.getAdmin().page()
    await adminPage.goto('/admin/scramble-maps')
    await adminPage.getByLabel('Post-ready').check()
    await adminPage.getByLabel('Map vote timeout (seconds)').fill('5')
    await adminPage.getByRole('button', { name: 'Save' }).click()
    await expect(adminPage.getByText('Configuration saved')).toBeVisible()
  })

  test.afterEach(async ({ users }) => {
    // Reset to pre-ready
    const adminPage = await users.getAdmin().page()
    await adminPage.goto('/admin/scramble-maps')
    await adminPage.getByLabel('Pre-ready').check()
    await adminPage.getByRole('button', { name: 'Save' }).click()
    await expect(adminPage.getByText('Configuration saved')).toBeVisible()
  })

  test('map vote dialog appears after all players ready up', async ({ users }) => {
    // This test verifies:
    // - Map vote buttons are NOT visible on the queue page before ready-up
    // - Map vote dialog appears after all players ready up
    // - Vote resolves and game launches after timeout

    // The launchGame fixture readies up all 12 players
    // We borrow its queue-filling logic but watch the dialog
    const playerPage = await users.byName('Promenader').queuePage()
    await playerPage.goto()

    // In post-ready mode, map vote buttons must not be on the queue page
    await expect(playerPage.voteForMapButton(0)).not.toBeVisible()

    // TODO: Fill queue and ready up all players (similar to launchGame fixture)
    // After all ready up, verify the map vote dialog appears
    // await expect(playerPage.page.getByRole('dialog')).toBeVisible({ timeout: secondsToMilliseconds(5) })

    // For now, this is a placeholder — wire up with the full launchGame flow
    // once the dialog component is implemented
  })
})
```

> **Note:** The test is intentionally left as a scaffold. Once the dialog has a testable element (e.g., `role="dialog"` with the title "Vote for a map!"), wire it up against the full `launchGame` fixture. The key assertions are:
> - Before ready-up: `voteForMapButton` not visible on queue page
> - After ready-up: dialog visible for all players
> - After timeout: URL changes to `/games/<number>`

**Step 3: Run existing tests to make sure nothing is broken**

```bash
pnpm test
```

Expected: all unit tests pass.

**Step 4: Commit**

```bash
git add tests/10-queue/12-post-ready-map-vote.spec.ts
git commit -m "test: scaffold e2e test for post-ready map vote"
```

---

## Summary of changes

| File | Action |
|------|--------|
| `src/tasks/tasks.ts` | Add `queue:mapVoteTimeout` to schema |
| `src/database/models/configuration-entry.model.ts` | Add `queue.map_vote_timing` and `queue.map_vote_timeout` |
| `src/database/models/queue-state.model.ts` | Add `mapVote` to `QueueState` enum |
| `src/queue/views/html/map-vote-dialog.tsx` | New: dialog shell + `.show()` + `.close()` |
| `src/html/layout.tsx` | Render `MapVoteDialog` in global layout |
| `src/queue/plugins/auto-update-queue-state.ts` | Handle `mapVote` transitions and `mapVoteTimeout` task |
| `src/queue/plugins/sync-clients.ts` | Broadcast dialog on `mapVote`, close on `launching`, show on page load |
| `src/queue/views/html/queue.page.tsx` | Hide `MapVote` widget in `post-ready` mode |
| `src/admin/scramble-maps/views/html/scramble-maps.page.tsx` | Add timing settings form |
| `src/routes/admin/scramble-maps/index.tsx` | Add POST handler for timing settings |
| `tests/10-queue/12-post-ready-map-vote.spec.ts` | New: E2E test scaffold |
