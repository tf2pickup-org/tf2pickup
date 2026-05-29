# Captain mode — design plan

## Overview

Captain mode is an alternative queue mechanism where two captains draft their team lineups
instead of the system auto-balancing by skill. It is an optional mode selectable at runtime
by an admin, running alongside the existing auto-balance mode in the same codebase.

---

## Player flow

```
waiting → ready → draft → launching
```

1. **waiting** — players add up to the queue offering one or more classes; eligible players
   also opt in as potential captains.
2. **ready** — the queue has enough players to form two full teams; all players must ready up
   to confirm they are at their computers. Existing ready-up machinery (timeouts, pre-ready
   timers, kick-unready) is reused unchanged.
3. **draft** — two captains have been selected; they alternate picking players and assigning
   them to classes; map banning happens as a sub-stage at the end (see below).
4. **launching** — teams and map are decided; game creation proceeds identically to auto mode.

---

## Multi-class queueing

Unlike auto mode (1 player → 1 fixed class slot), captain mode players register interest in
one or more classes:

```ts
// New DB collection: queue.players  (captain mode only)
type QueuePlayerModel = {
  steamId: SteamId64
  offeredClasses: Tf2ClassName[]   // ≥1 class
  wantsCaptain: boolean
  joinedAt: Date                   // used for display order / tiebreaking
  ready: boolean                   // set during the ready-up phase
}
```

The existing `queue.slots` collection is not used during captain mode queueing. It is
populated at the end of the draft as the canonical game slot list that `games/create.ts`
consumes (same interface as today).

---

## Queue readiness check — `canFormTeams`

The transition from `waiting` to `ready` is gated on whether the current player pool can
cover all required class slots. This is a bipartite matching problem:

- Left nodes: players, edges to each class they offer.
- Right nodes: required class slots (e.g. 2 scouts, 2 soldiers, 1 demo, 1 medic per team × 2).
- A valid matching must cover all right nodes.

A new function `canFormTeams(players: QueuePlayerModel[], config: QueueConfig): boolean`
implements this check. It is called every time `queue/players:updated` is emitted.

The UI must display a per-class requirement matrix showing how many more players offering
each class are still needed, so players know what is missing.

More than the minimum number of players may be present when the draft starts (players can
join during the ready-up phase). This is by design — the draft always works with whoever
readied up.

---

## Captain eligibility

v1 criterion: player has at least N games played, where N is a new runtime configuration
value (`queue.captain_min_games`, default 10). The player must also explicitly opt in via
`wantsCaptain: true`.

If fewer than two eligible players opt in, the transition to `draft` does not happen and the
queue stays in `ready` until the timeout kicks unready players.

---

## Pick order

For 6v6 (10 non-captain players to place):

```
A B B A A B B A A B  →  (A auto-filled)  (B auto-filled)
```

Where A = BLU captain, B = RED captain. Each captain makes 5 explicit picks and is then
auto-assigned the single remaining open class slot on their team. The auto-fill is an
invariant: the pick constraint logic guarantees exactly one open slot per team after pick 10.

The pick order is encoded as a config value per format (e.g. `captain.pickOrder` in the
queue config file).

### Constraint enforcement

When a captain picks a player and assigns them a class, the system runs `canFormTeams` on
the remaining unassigned players against the remaining unfilled slots (excluding the slot
just assigned). If the assignment would make the remaining pool unable to fill remaining
slots, the pick is rejected.

### Class assignment for captains

Captains play in the game. After all non-captain players are placed, each captain is
sequentially assigned their class (BLU captain chooses first, RED captain second) from the
open class slots remaining on their team.

Future: class overrides (allow all players to choose preferred class, not just captains) — out of scope for v1.

---

## Draft timeout

Each pick turn has a configurable time limit (`queue.captain_pick_timeout`, ms). On expiry:

1. The current captain is kicked from the queue.
2. The draft is fully reset (all captain picks discarded, draft state cleared).
3. Queue state is re-evaluated against the remaining player pool:
   - `canFormTeams` returns true **and** ≥ N (minimum) players remain → transition to `ready`
     (players who were already ready stay marked ready).
   - Otherwise → transition to `waiting`.

v1: no delay before state re-evaluation. A cooldown for the kicked captain is planned for a
future iteration.

---

## Map banning (sub-stage of draft)

Map banning takes place after all player picks are complete, before `launching`. It is not
a separate `QueueState` value — sub-stage is derived from the draft document itself.

Flow:
1. System presents 3 maps drawn from the existing map pool (same cooldown mechanism as
   auto mode's `reset-map-options.ts` and `apply-map-cooldown.ts` — those functions are
   shared).
2. BLU captain bans one map.
3. RED captain bans one map.
4. The remaining map is the selected map.

Each ban has a timeout (same `queue.captain_pick_timeout`). On expiry the ban is auto-assigned
(random remaining map). No draft reset on map ban timeout — captains are not kicked for
being slow on a ban.

```ts
// Embedded in the draft document (queue.draft collection)
type MapBanState = {
  maps: string[]          // initial 3-map pool
  bans: Array<{ captain: SteamId64; team: Tf2Team; map: string }>
  selectedMap?: string    // set after both bans complete
}
```

---

## New `QueueState` value

```ts
enum QueueState {
  waiting   = 'waiting',
  ready     = 'ready',     // unchanged
  draft     = 'draft',     // new — encompasses picking + map banning
  launching = 'launching',
}
```

---

## Code structure

Option B — flat sibling modules (consistent with the project's existing layout):

```
src/
  queue/                ← shared primitives only
    get-state.ts
    set-state.ts
    with-queue-lock.ts
    types/
      queue-state.ts    (QueueState enum, gains 'draft')

  queue-auto/           ← current src/queue/ contents, renamed
    join.ts             (slot-based)
    leave.ts
    kick.ts
    ready-up.ts, unready.ts
    reset.ts
    get-slots.ts
    vote-map.ts, get-map-vote*.ts, get-map-winner.ts
    mark-as-friend.ts, get-friends.ts, cleanup-friendships.ts
    config.ts, configs/
    pipelines/
    metrics.ts
    plugins/
      auto-update-queue-state.ts
      auto-reset.ts
      auto-cleanup-friendships.ts
      gateway-listeners.ts
      kick-disconnected-players.ts   ← moves here (calls auto kick)
      kick-banned-players.ts         ← same
      kick-replacement-players.ts    ← same
      sync-clients.ts
    views/

  queue-captain/        ← new
    join.ts             (multi-class player registration)
    leave.ts
    kick.ts
    ready-up.ts, unready.ts
    can-form-teams.ts
    select-captains.ts
    get-pick-order.ts
    pick.ts
    auto-pick.ts        (timeout fallback)
    ban-map.ts
    plugins/
      update-queue-state.ts
      gateway-listeners.ts
      kick-disconnected-players.ts
      kick-banned-players.ts
      kick-replacement-players.ts
      sync-clients.ts
    views/

  maps/                 ← extracted from src/queue/ (was map-pool/, reset-map-options.ts, apply-map-cooldown.ts)
    get.ts
    reset-options.ts
    apply-cooldown.ts
    set.ts
    pool/
```

`kick-disconnected-players`, `kick-banned-players`, `kick-replacement-players`, and
`sync-clients` appear in both mode directories because they call into mode-specific `kick()`
and emit mode-specific events. They share the same concept but different implementations.

The refactor of `src/queue/` → `src/queue-auto/` is a dedicated prerequisite PR (mechanical
import-path update, no logic changes).

---

## Hot-switching the mode

The mode is stored in the runtime configuration module (`queue.mode`, values `'auto'` |
`'captain'`, default `'auto'`). It is changeable from the admin panel without a server
restart.

### Mechanism

A dedicated shared plugin handles the transition:

```ts
// src/queue/plugins/handle-mode-change.ts
events.on('configuration:updated', async ({ key, value }) => {
  if (key !== 'queue.mode') return
  await clearQueue()             // clears queueSlots AND queuePlayers; no-op on inactive one
  await setState(QueueState.waiting)
  events.emit('queue/mode:changed', { mode: value })
})
```

Mode-specific plugins subscribe/unsubscribe based on `queue/mode:changed` (not
`configuration:updated` directly — avoids race conditions between the two mode plugins both
reacting to the same event). On startup each plugin reads `queue.mode` once to set its
initial active state.

### Admin panel

A new configuration page in the admin panel exposes `queue.mode` and `queue.captain_*`
settings. When the operator changes the mode, a confirmation dialog displays: *"Changing
this will reset the queue and kick all N players currently in it."* The player count is
read live from whichever collection is currently active.

---

## New configuration entries

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `queue.mode` | `'auto' \| 'captain'` | `'auto'` | Active queue mode |
| `queue.captain_min_games` | `number` | `10` | Minimum games played to be eligible as captain |
| `queue.captain_pick_timeout` | `number` (ms) | `60000` | Time per pick turn before auto-kick |

All added to `src/database/models/configuration-entry.model.ts` following the existing Zod
discriminated-union pattern.

---

## New DB collections

| Collection | Model | Purpose |
|---|---|---|
| `queue.players` | `QueuePlayerModel` | Captain-mode player registrations |
| `queue.draft` | `DraftModel` | Active draft state (picks + map ban) |

`queue.slots`, `queue.state`, `queue.mapoptions`, `queue.mapvotes`, `queue.friends` remain
auto-mode collections, unchanged.

---

## New events

```ts
// additions to src/events.ts
'queue/players:updated':    { players: QueuePlayerModel[] }
'queue/captain:selected':   { captains: [SteamId64, SteamId64] }
'queue/draft:pickMade':     { captain: SteamId64; player: SteamId64; gameClass: Tf2ClassName; team: Tf2Team }
'queue/draft:pickExpired':  { team: Tf2Team; captain: SteamId64 }
'queue/draft:mapBanMade':   { captain: SteamId64; map: string; remaining: string[] }
'queue/draft:completed':    { selectedMap: string }
'queue/mode:changed':       { mode: 'auto' | 'captain' }
```

---

## New WebSocket events

| Event | Direction | Description |
|---|---|---|
| `queue:addClasses` | client → server | Player sets their offered class list |
| `queue:setCaptainWish` | client → server | Player toggles captain opt-in |
| `queue:pick` | client → server | Captain picks a player and assigns a class |
| `queue:banMap` | client → server | Captain bans a map |

---

## Game model changes

`GameModel` gains an optional `captains` field populated only for captain-mode games:

```ts
export interface GameModel {
  // ...existing fields...
  captains?: Record<Tf2Team, SteamId64>   // e.g. { blu: '...', red: '...' }
}
```

`undefined` means the game was created in auto mode. This is intentionally sparse — no
migration needed for existing games, and auto-mode game creation leaves the field unset.

---

## Game creation changes

`src/games/create.ts` currently calls `pickTeams()` for auto-balancing. For captain mode the
teams are already determined by the draft. `create()` gains an optional `captainDraft`
parameter:

```ts
create(
  slots: QueueSlotModel[],
  map: string,
  options?: { friends?: SteamId64[][]; captainDraft?: DraftModel }
)
```

When `captainDraft` is provided, `pickTeams()` is bypassed, the draft's assignments are
translated directly into `GameSlotModel[]`, and `captains` is populated from the draft.
The rest of the game creation pipeline (server assignment, RCON configuration, etc.) is
unchanged.

---

## Prerequisites / implementation order

1. **Extract `src/maps/` module** — move map pool code out of `src/queue/`; update imports.
2. **Rename `src/queue/` → `src/queue-auto/`** — mechanical import-path update; extract
   shared primitives to new thin `src/queue/` (state + lock + types). No logic changes.
3. **Add `queue.mode` configuration entry + admin UI page** — includes hot-switch mechanism
   and confirmation dialog.
4. **Implement `src/queue-captain/`** — new module; bipartite matching (`can-form-teams`),
   player registration, ready-up, captain selection, draft/picking, map banning, game hand-off.
5. **New DB collections + migrations** — `queue.players`, `queue.draft`.
6. **Views** — captain mode queue page, draft UI, map-ban UI.

Steps 1 and 2 are prerequisite refactors with zero behaviour changes and should be separate
PRs before any captain-mode code lands.

---

## Out of scope for v1

- Class overrides (letting players specify a preferred class instead of auto-fill for captains)
- Pick timeout cooldown (kicked captain cannot re-add immediately)
- Admin override of captain picks
- More than two modes
