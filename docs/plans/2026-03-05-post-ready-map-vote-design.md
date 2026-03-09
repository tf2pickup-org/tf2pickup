# Post-Ready Map Vote — Design

**Date:** 2026-03-05

## Overview

An alternative map voting mode where players vote for a map **after** all 12 players have readied up, rather than during the queue wait. The feature is optional and toggled via admin configuration. The existing pre-ready map vote behaviour is preserved as the default.

## Configuration

Two new keys added to `configuration-entry.model.ts`:

| Key                      | Type                          | Default                     | Description                    |
| ------------------------ | ----------------------------- | --------------------------- | ------------------------------ |
| `queue.map_vote_timing`  | `'pre-ready' \| 'post-ready'` | `'pre-ready'`               | Selects the map voting mode    |
| `queue.map_vote_timeout` | `number` (ms)                 | `secondsToMilliseconds(10)` | Duration of the map vote phase |

Both keys are configurable from the admin panel.

## Queue State Machine

New state added to `QueueState` enum:

```
waiting → ready → mapVote → launching
```

- `mapVote`: all players have readied up; the map vote dialog is open; the server is waiting for the timer to expire.

**Transition logic** (in `auto-update-queue-state.ts`):

- When `readyPlayerCount === requiredPlayerCount` in `ready` state:
  - If `queue.map_vote_timing === 'post-ready'`: set state to `mapVote`, schedule `queue:mapVoteTimeout`
  - If `queue.map_vote_timing === 'pre-ready'`: set state to `launching` (existing behaviour)
- When `queue:mapVoteTimeout` fires: call `getMapWinner()`, set state to `launching`
- If queue resets to `waiting` from `mapVote`: cancel `queue:mapVoteTimeout`

## UI

### Queue page — map vote widget

| Mode         | Behaviour                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `pre-ready`  | Shown as today: always visible, live vote percentages                                            |
| `post-ready` | Completely hidden — no map names, thumbnails, or vote counts while in `waiting` or `ready` state |

### Map vote dialog (new component)

- Shown to all 12 players when queue enters `mapVote` state (via `queue/state:updated` broadcast in `sync-clients.ts`)
- Contains map vote buttons with thumbnails, map name, and live vote percentage — same visual as the existing `MapVote` component
- Live vote updates: `queue/mapVoteResults:updated` events push `MapResult` fragments to all clients on `/`, same as current behaviour
- Includes a countdown display (server-rendered initial value, JS ticks down client-side)
- No manual close button — auto-closes when `mapVote` → `launching` transition occurs

### On page load / navigation during `mapVote` state

`syncQueuePage()` checks if queue state is `mapVote` and, if so, sends the map vote dialog immediately:

- **Player in the queue**: functional vote buttons (can vote)
- **Spectator / not in queue**: read-only results (vote % visible, buttons disabled)

## Vote Handling

- `voteMap()` and the `queue:votemap` WebSocket gateway handler are unchanged
- Map options are already set when `mapVote` is entered (reset happens on queue reset to `waiting`)
- Winner resolution: `getMapWinner()` — most votes wins; ties broken randomly (existing behaviour)
- Always waits the full `queue.map_vote_timeout` duration regardless of how many players have voted

## Edge Cases

| Scenario                            | Behaviour                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Player disconnects during `mapVote` | Vote proceeds; disconnected player remains in their slot and will be part of the game |
| No votes cast by timeout            | `getMapWinner()` picks randomly from all options                                      |
| All votes cast before timeout       | Timer still runs to completion                                                        |
