# Clear Queue Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only "Clear queue" button that kicks all players from the queue and sends a Discord notification to admins.

**Architecture:** A new `DELETE /queue/players` route calls `kick()` on all occupied slots and emits a new `queue:cleared` event. A Discord plugin listens to that event and notifies admins. The button renders only for admins in the queue page header, with HTMX confirmation.

**Tech Stack:** Fastify 5, HTMX, @kitajs/html JSX, Discord.js EmbedBuilder, Vitest, node-html-parser

---

## Chunk 1: Event type and route

### Task 1: Add `queue:cleared` event type

**Files:**
- Modify: `src/events.ts`

- [ ] **Step 1: Add the event to the Events interface**

Open `src/events.ts` and add the following after the `'queue:playerKicked'` entry (around line 186):

```ts
'queue:cleared': {
  admin: SteamId64
  playerCount: number
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors related to `events.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/events.ts
git commit -m "feat(queue): add queue:cleared event type"
```

---

### Task 2: Create DELETE /queue/players route

**Files:**
- Create: `src/routes/queue/players/index.ts`

Routes at `src/routes/queue/players/index.ts` are auto-loaded by `@fastify/autoload` as `DELETE /queue/players`. The route is protected by the `authorize` config hook (see `src/auth/plugins/authorize.ts`).

- [ ] **Step 1: Create the route file**

Create `src/routes/queue/players/index.ts`:

```ts
import { PlayerRole } from '../../../database/models/player.model'
import { routes } from '../../../utils/routes'
import { getSlots } from '../../../queue/get-slots'
import { kick } from '../../../queue/kick'
import { events } from '../../../events'

export default routes(async app => {
  app.delete(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (request, reply) => {
      const slots = await getSlots()
      const steamIds = slots.flatMap(slot => (slot.player ? [slot.player.steamId] : []))

      if (steamIds.length > 0) {
        await kick(...steamIds)
        events.emit('queue:cleared', {
          admin: request.user!.player.steamId,
          playerCount: steamIds.length,
        })
      }

      reply.status(204).send()
    },
  )
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors. The route will be served at `DELETE /queue/players`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/queue/players/index.ts
git commit -m "feat(queue): add DELETE /queue/players route for admins"
```

---

## Chunk 2: Discord plugin and UI button

### Task 3: Create Discord notification plugin

**Files:**
- Create: `src/discord/plugins/notify-queue-cleared.ts`

This plugin follows the exact same pattern as `src/discord/plugins/notify-player-bans.ts`. It is auto-loaded at startup because all `**/plugins/**` files are loaded by `@fastify/autoload` (see `src/main.ts`).

- [ ] **Step 1: Create the plugin file**

Create `src/discord/plugins/notify-queue-cleared.ts`:

```ts
import fp from 'fastify-plugin'
import { events } from '../../events'
import { toAdmins } from '../to-admins'
import { EmbedBuilder } from 'discord.js'
import { players } from '../../players'
import { environment } from '../../environment'
import { client } from '../client'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client) {
      return
    }

    events.on(
      'queue:cleared',
      safe(async ({ admin, playerCount }) => {
        const { name, avatar, steamId } = await players.bySteamId(admin, [
          'name',
          'avatar.medium',
          'steamId',
        ])

        await toAdmins({
          embeds: [
            new EmbedBuilder()
              .setColor('#fd7e14')
              .setAuthor({
                name,
                iconURL: avatar.medium,
                url: `${environment.WEBSITE_URL}/players/${steamId}`,
              })
              .setTitle('Queue cleared')
              .setDescription(`Players kicked: **${playerCount}**`)
              .setFooter({
                text: environment.WEBSITE_NAME,
                iconURL: `${environment.WEBSITE_URL}/favicon.png`,
              })
              .setTimestamp(),
          ],
        })
      }),
    )
  },
  {
    name: 'discord - notify on queue cleared',
  },
)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/discord/plugins/notify-queue-cleared.ts
git commit -m "feat(discord): notify admins when queue is cleared"
```

---

### Task 4: Add ClearQueueButton to queue page (TDD)

**Files:**
- Modify: `src/queue/views/html/queue.page.tsx`
- Create: `src/queue/views/html/queue.page.test.tsx`

The `ClearQueueButton` has conditional logic (admin-only rendering) that benefits from unit testing. The test uses the same pattern as `queue-slot.test.tsx`: render to HTML, parse with `node-html-parser`, assert on DOM presence.

- [ ] **Step 1: Write the failing test**

Create `src/queue/views/html/queue.page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { parse } from 'node-html-parser'
import { ClearQueueButton } from './queue.page'
import { PlayerRole } from '../../../database/models/player.model'
import type { User } from '../../../auth/types/user'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

const adminUser: User = {
  player: {
    steamId: '76561198000000001' as SteamId64,
    roles: [PlayerRole.admin],
    name: 'Admin',
    avatar: { medium: '' },
    preferences: {},
    hasAcceptedRules: true,
    activeGame: undefined,
    twitchTvProfile: undefined,
  },
}

const regularUser: User = {
  player: {
    ...adminUser.player,
    roles: [],
  },
}

describe('ClearQueueButton', () => {
  it('renders the button for admins', async () => {
    const html = await ClearQueueButton({ actor: adminUser })
    const root = parse(html)
    const button = root.querySelector('[hx-delete="/queue/players"]')
    expect(button).not.toBeNull()
  })

  it('does not render for non-admins', async () => {
    const html = await ClearQueueButton({ actor: regularUser })
    const root = parse(html)
    expect(root.querySelector('[hx-delete="/queue/players"]')).toBeNull()
  })

  it('does not render when there is no actor', async () => {
    const html = await ClearQueueButton({ actor: undefined })
    const root = parse(html)
    expect(root.querySelector('[hx-delete="/queue/players"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm test -- src/queue/views/html/queue.page.test.tsx
```

Expected: FAIL — `ClearQueueButton` is not exported from `queue.page`.

- [ ] **Step 3: Add ClearQueueButton to queue.page.tsx**

In `src/queue/views/html/queue.page.tsx`:

1. Add `IconBan` to the icons import. Find the existing import from icons and update it:

```ts
import {
  IconBan,
  // ...other icons already imported
} from '../../../html/components/icons'
```

Note: check the current imports at the top of `queue.page.tsx` — there may not be an icon import yet. If not, add a new import:

```ts
import { IconBan } from '../../../html/components/icons'
```

2. Add the exported `ClearQueueButton` function near the bottom of the file (after the `Queue` function):

```tsx
export async function ClearQueueButton(props: { actor?: User | undefined }) {
  if (!props.actor?.player.roles.includes(PlayerRole.admin)) {
    return <></>
  }

  return (
    <button
      class="button button--danger"
      hx-delete="/queue/players"
      hx-confirm="Are you sure you want to kick everyone from the queue?"
    >
      <IconBan />
      <span>Clear queue</span>
    </button>
  )
}
```

3. Add a new import for `PlayerRole` — `queue.page.tsx` has no existing `player.model` import:

```ts
import { PlayerRole } from '../../../database/models/player.model'
```

4. Render the button inside `QueueState`. Replace the bare `<PreReadyUpButton>` line with a `<div class="flex flex-row gap-2">` wrapper containing both `<ClearQueueButton>` and `<PreReadyUpButton>` — the wrapper is required for the two buttons to sit side by side:

```tsx
async function QueueState(props: { actor?: User | undefined; required: number }) {
  return (
    <div class="flex flex-col gap-2">
      <form ws-send class="flex flex-row items-center justify-center">
        <h3 class="text-ash flex-1 text-center text-2xl font-bold md:text-start">
          Players: <CurrentPlayerCount />/{props.required}
        </h3>

        <div class="flex flex-row gap-2">
          <ClearQueueButton actor={props.actor} />
          <PreReadyUpButton actor={props.actor?.player.steamId} />
        </div>
      </form>
      <div class="bg-abru-light-25 h-[2px] rounded-xs"></div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm test -- src/queue/views/html/queue.page.test.tsx
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/queue/views/html/queue.page.tsx src/queue/views/html/queue.page.test.tsx
git commit -m "feat(queue): add admin-only clear queue button"
```
