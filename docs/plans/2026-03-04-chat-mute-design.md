# Chat Mute System Design

**Date:** 2026-03-04
**Status:** Approved

## Overview

Admins can mute selected players for a time-limited period, preventing them from posting new chat messages. Mutes are managed from the player edit page alongside existing bans.

## Data Model

Add an optional `chatMutes?: PlayerBan[]` field to `PlayerModel` — same shape as the existing `bans` array:

```ts
{
  actor: SteamId64 | 'bot'
  start: Date
  end: Date
  reason: string
}
```

No new collection or migration required (field is optional; MongoDB handles missing arrays gracefully).

## Business Logic

Four new files mirroring the ban equivalents:

- `src/players/add-chat-mute.ts` — pushes a new entry to `chatMutes`, emits `player/chatMute:added`
- `src/players/revoke-chat-mute.ts` — soft-revokes by setting `end` to now, emits `player/chatMute:revoked`
- `src/players/has-active-chat-mute.ts` — pure helper, checks if player has an entry where `start <= now < end`
- `src/chat/send.ts` — add mute check before insert; throw `403 Forbidden` if author is muted

New events in `src/events.ts`:

- `player/chatMute:added`: `{ player: SteamId64, chatMute: PlayerBan }`
- `player/chatMute:revoked`: `{ player: SteamId64, chatMute: PlayerBan, admin: SteamId64 }`

## Admin UI

New **"Chat mutes"** tab on the player edit page sidebar. Routes under `src/routes/players/:steamId/edit/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/edit/chat-mutes` | List all mutes (sorted by start DESC), revoke button per active mute |
| GET | `/edit/chat-mutes/add` | Add mute form (Duration / End Date / Forever — same as ban form) |
| POST | `/edit/chat-mutes/add` | Create mute, redirect to list |
| PUT | `/edit/chat-mutes/:muteStart/revoke` | HTMX inline revoke |

## Chat Input UI

When rendering the chat input, the server checks `hasActiveChatMute(player)`. If muted, the input is rendered as:

```html
<input disabled placeholder="you are currently muted" />
```

State reflects at page load. The `POST /` route enforces the mute server-side regardless of client state.

## Out of Scope

- Real-time UI update when a mute is applied mid-session (no WebSocket push)
- Bot-issued mutes
