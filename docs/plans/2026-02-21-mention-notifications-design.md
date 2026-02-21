# Mention Notifications Design

**Date:** 2026-02-21
**Feature:** Notify online players when they are mentioned in chat

## Overview

When a player is mentioned in chat and is currently online, they receive:

- A sound notification (new `mention.webm` sound asset)
- A title change: `[★ mention] 6/12 tf2pickup.org` (static, until dismissed)
- A star/badge indicator on the chat tab button

All notifications are dismissed when the browser tab gains focus AND the chat panel is visible.

## Approach

Targeted server-side WebSocket fragment + client-side notification module.

The server sends a dedicated WebSocket fragment only to the mentioned player(s) who are online. The client module manages all notification state and dismissal logic.

## Components

### 1. Server — `src/chat/plugins/notify-mentioned-players.ts`

New Fastify plugin. Listens to the existing `chat:messageSent` event.

For each `steamId` in `message.mentions`:

- Query `onlinePlayers` collection to check if the player is currently online
- If online, retrieve the player's sound volume preference
- Send a targeted WebSocket fragment via `app.gateway.to({ player: steamId })`

### 2. Server — `src/chat/views/html/chat-mention-notification.tsx`

New JSX fragment injected into `#queue-notify-container` via `hx-swap-oob="beforeend"`.

Contains two self-cleaning elements (both use `remove-me="0s"`):

1. A `<div play-sound-src="/sounds/mention.webm" play-sound-volume={volume}>` — handled by the existing `play-sound` HTMX extension
2. A `<script type="module">` that dispatches `new CustomEvent('chat:mentioned')` on `document`

### 3. Client — `src/html/@client/mention-notification.ts`

New module, imported in `main.ts` alongside other feature modules.

**On `chat:mentioned` event:**

- Set `hasMention = true`
- Add `has-mention` CSS class to `[data-tabs-select="tab-chat"]` (shows star badge via CSS)
- Prefix `document.title` with `[★ mention] `

**Title coordination:**

- A `MutationObserver` on `<title>` re-applies the `[★ mention] ` prefix whenever `SetTitle` overwrites the title while `hasMention` is `true`

**Dismissal — clears state when window is focused AND chat tab is active:**

- Listens to `document.visibilitychange`
- Listens to `click` on the chat tab button
- Condition: `document.visibilityState === 'visible'` AND `[data-tabs-select="tab-chat"]` has class `active`
- On clear: remove `has-mention` class, strip `[★ mention] ` prefix from title, set `hasMention = false`

### 4. CSS

Add `::after` pseudo-element on `[data-tabs-select="tab-chat"].has-mention` to show a small gold star or notification dot, styled to match the existing design language.

### 5. Sound Asset

`public/sounds/mention.webm` — already converted from `mention.wav` using ffmpeg/Opus.
`public/sounds/mention.wav` — kept as fallback.

## Data Flow

```
User sends message with @mention
        ↓
chat.send() resolves mention → stores message with mentions: SteamId64[]
        ↓
chat:messageSent event emitted
        ↓
notify-mentioned-players plugin: for each mentioned steamId
        ↓
onlinePlayers collection: is player online?
        ↓ (yes)
gateway.to({ player: steamId }).send(ChatMentionNotification)
        ↓
Client receives WS fragment → play-sound extension fires
        ↓
CustomEvent('chat:mentioned') dispatched
        ↓
mention-notification.ts: add has-mention class + prefix title
        ↓
User focuses window + chat tab visible
        ↓
mention-notification.ts: clear all notification state
```

## Files Changed / Created

| File                                                | Action                                                 |
| --------------------------------------------------- | ------------------------------------------------------ |
| `src/chat/plugins/notify-mentioned-players.ts`      | Create                                                 |
| `src/chat/views/html/chat-mention-notification.tsx` | Create                                                 |
| `src/html/@client/mention-notification.ts`          | Create                                                 |
| `src/html/@client/main.ts`                          | Edit — import mention-notification                     |
| `src/queue/views/html/sidebar.tsx`                  | Edit — no structural changes needed; CSS handles badge |
| CSS (chat or sidebar styles)                        | Edit — add `has-mention` badge styles                  |
| `public/sounds/mention.webm`                        | Add (already done)                                     |

## Non-Goals

- No browser (OS-level) notification for mentions — sound + tab indicators are sufficient
- No persistence of unread mention state across page reloads
- No notification if the mentioned player is offline
