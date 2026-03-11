# Clear Queue Feature — Design Spec

**Date:** 2026-03-11
**Status:** Approved

## Overview

Add an admin-only "Clear queue" button to the queue page. When clicked, it asks for confirmation, then kicks all players currently in the queue. A Discord notification is sent to the admins channel with details of the action.

## Requirements

- Only admins can see and use the button
- The button shows a browser confirmation dialog before acting
- Kicking uses the existing `kick()` function (not `reset()`) — preserves queue state and map options
- A Discord notification is sent to admins with: which admin triggered it, how many players were kicked, timestamp

## Design

### 1. New event: `queue:cleared`

Added to `src/events.ts`:

```ts
'queue:cleared': {
  admin: SteamId64
  playerCount: number
  clearedAt: Date
}
```

### 2. Route: `DELETE /queue/players`

**File:** `src/routes/queue/players/index.ts`

- Authorization: `config: { authorize: [PlayerRole.admin] }`
- Reads all occupied queue slots, extracts player `steamId`s
- Calls `kick(...steamIds)`
- Emits `'queue:cleared'` with admin's steamId, kicked player count, and `new Date()`
- Returns `204` — no body needed; queue slot updates propagate to clients via existing WebSocket broadcast that `kick()` already triggers via `queue/slots:updated`

### 3. Discord plugin: `notify-queue-cleared`

**File:** `src/discord/plugins/notify-queue-cleared.ts`

Mirrors the pattern of `notify-player-bans.ts`:

- Listens to `'queue:cleared'` event
- Returns early if Discord client is not configured
- Looks up admin player (name, avatar.medium, steamId)
- Calls `toAdmins()` with an `EmbedBuilder`:
  - Color: `#fd7e14` (orange — warning/action tone)
  - Author: admin name, avatar, link to their profile page
  - Title: `"Queue cleared"`
  - Description: `Players kicked: **N**`
  - Timestamp: `clearedAt`
  - Footer: `WEBSITE_NAME` + `{WEBSITE_URL}/favicon.png`

### 4. UI button

**File:** `src/queue/views/html/queue.page.tsx`

A new `ClearQueueButton` async function component added to the file:

- Accepts `actor?: User | undefined`
- Returns `<></>` if actor is absent or does not have `PlayerRole.admin`
- Renders a red danger button with label "Clear queue"
- HTMX attributes:
  - `hx-delete="/queue/players"`
  - `hx-confirm="Are you sure you want to kick everyone from the queue?"`
- No `hx-target` required — WebSocket handles the slot updates

Placed in `QueueState` component alongside `<PreReadyUpButton>`.

## Files Changed

| File | Change |
|------|--------|
| `src/events.ts` | Add `'queue:cleared'` event type |
| `src/routes/queue/players/index.ts` | New file — DELETE route |
| `src/discord/plugins/notify-queue-cleared.ts` | New file — Discord notification plugin |
| `src/queue/views/html/queue.page.tsx` | Add `ClearQueueButton` component, render in `QueueState` |

## Out of Scope

- No change to `reset()` or queue state
- No new WebSocket event needed
- No changes to existing queue slot update broadcast logic
