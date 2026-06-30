# Multi-gamemode support — implementation plan

> **Status:** draft · **Target release:** v5 (breaking change)
>
> This document is the working plan for making a single tf2pickup instance serve
> multiple gamemodes at once (e.g. 6v6 + 9v9 + bball on one site), instead of one
> gamemode per deployment/subdomain. It is the source of truth while the work is
> in progress; it will be removed (or moved to `docs/`) before the PR is merged.

## Goals

- One instance hosts several gamemodes simultaneously.
- The queue page lets a player pick **one** gamemode and join its queue.
- The game list, player profiles, hall of fame and statistics span **all**
  gamemodes, with per-gamemode filtering ("All gamemodes" + per-mode tabs).
- Admins/super-users decide which gamemodes an instance supports.
- Existing single-gamemode instances upgrade cleanly, and two instances
  (e.g. `tf2pickup.eu` 6v6 + `hl.tf2pickup.eu` 9v9) can be **merged** into one.

## Non-goals (v5)

- A player being in more than one queue at the same time. **One player → one
  queue at a time.**
- Runtime add/remove of a gamemode's _existence_ on an instance (the enabled set
  is fixed at boot; see [Enabled gamemodes](#enabled-gamemodes)).
- Cross-gamemode matchmaking / shared ELO across modes.

---

## Core concept: the `gamemode` dimension

Today a single gamemode is chosen at boot via the `QUEUE_CONFIG` env var and
resolved once into a module-level singleton (`src/queue-auto/config.ts`). The
whole app assumes that singleton.

We introduce a first-class `Gamemode` value that flows through queue, games,
player skill/ELO/stats, maps, configuration, events and logs.

```ts
// shared/types/gamemode.ts  (new)
export enum Gamemode {
  sixes = '6v6',
  highlander = '9v9',
  bball = 'bball',
  ultiduo = 'ultiduo',
  test = 'test',
}
```

The **universe** of gamemodes equals the set of queue configs we ship under
`src/queue-auto/configs/`. Today only `6v6` and `9v9` have configs; adding
`bball`/`ultiduo` later just means adding a config + map pool defaults.

### Decisions

| Question                          | Decision                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Per-player concurrency            | One player can be in **one** queue at a time. Joining queue B auto-leaves queue A.                                                  |
| Game numbering on merge           | Re-sequence **all** games across merged instances by launch date, assign fresh global numbers. Keep a legacy mapping for redirects. |
| Backward-compat for old game URLs | `/games/:number?old_gamemode=6v6` → 302 to the new number.                                                                          |
| Release                           | Breaking change, **v5**.                                                                                                            |

---

## Data model changes

### Players — skill / ELO / stats become per-gamemode

This is the largest and riskiest change. Today these are keyed by class only, so
6v6-scout and 9v9-scout collide. They gain a gamemode dimension:

```ts
// before
skill?: Partial<Record<Tf2ClassName, number>>
elo?: Partial<Record<Tf2ClassName, number>>
stats: { totalGames: number; gamesByClass: Partial<Record<Tf2ClassName, number>> }

// after
skill?: Partial<Record<Gamemode, Partial<Record<Tf2ClassName, number>>>>
elo?:   Partial<Record<Gamemode, Partial<Record<Tf2ClassName, number>>>>
eloHistory?:   { at: Date; gamemode: Gamemode; elo: PlayerElo; game: GameNumber }[]
skillHistory?: { at: Date; gamemode: Gamemode; ... }[]
stats: {
  totalGames: number                                   // across all modes
  gamesByGamemode: Partial<Record<Gamemode, number>>
  gamesByClass: Partial<Record<Gamemode, Partial<Record<Tf2ClassName, number>>>>
}
```

Touches: `calculate-elo-updates.ts`, `update-player-elo.ts`, `update-player-stats.ts`,
`make-skill-suggestions.ts`, `meets-skill-threshold.ts`, admin `skill-import-export`
(CSV gains a gamemode column), player skill edit route, player-restrictions route.

### Games — gain a `gamemode` field + legacy mapping

```ts
interface GameModel {
  // ...
  gamemode: Gamemode
  legacy?: { gamemode: Gamemode; number: GameNumber } // set only on merged games
}
```

`create.ts` sets `gamemode`. The game list, ELO/stats routing and per-gamemode
hall of fame all key off it. `legacy` powers the `old_gamemode` redirect.

### Queue collections — gain a `gamemode` discriminator

`queue.slots`, `queue.state`, `queue.mapoptions`, `queue.mapvotes`,
`queue.friends` each gain `gamemode`, and **every query is scoped** by it. The
state machine becomes per-gamemode (N independent queues).

### Maps — pool becomes per-gamemode

`maps` collection entries gain `gamemode`; `mapPool.get(gamemode)` and the
default pools become per-mode (6v6 5cp pool ≠ 9v9 pool). Whitelist follows the
config classification below.

---

## Configuration classification

Each existing configuration key is classified as **global**, **per-gamemode**, or
**inherited** (global base value, with optional per-gamemode override). Per-gamemode
and inherited keys are stored under a gamemode-scoped key.

| Key                                                                       | Scope            | Notes                                                               |
| ------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| `games.default_player_skill`                                              | **per-gamemode** | class set + starting skill differ per mode                          |
| `games.whitelist_id`                                                      | **per-gamemode** | different competitive whitelist per mode                            |
| `queue.player_skill_threshold`                                            | **per-gamemode** | skill is per-mode now                                               |
| `queue.map_cooldown`                                                      | **per-gamemode** | map pools differ                                                    |
| `games.auto_force_end_threshold`                                          | **per-gamemode** | bigger teams warrant a higher threshold; per-mode sensible defaults |
| map pool (`maps` collection)                                              | **per-gamemode** |                                                                     |
| `games.join_queue_cooldown`                                               | **inherited**    | per-class; allow per-mode override                                  |
| `games.execute_extra_commands`                                            | **inherited**    | global base commands + per-mode extras                              |
| `games.cooldown_levels`                                                   | global           | player-behaviour bans, mode-agnostic                                |
| `games.skill_step` / `games.skill_suggestions`                            | global           | admin-tool UX                                                       |
| `games.join_gameserver_timeout` / `rejoin_gameserver_timeout`             | global           |                                                                     |
| `games.logs_tf_upload_method`                                             | global           |                                                                     |
| `games.hide_server_info_from_spectators`                                  | global           |                                                                     |
| `games.voice_server*` (all)                                               | global           |                                                                     |
| `queue.ready_up_timeout` / `ready_state_timeout` / `pre_ready_up_timeout` | global           | queue UX timing                                                     |
| `queue.require_player_verification`                                       | global           |                                                                     |
| `players.*` (etf2l, min hours, bypass)                                    | global           | registration restrictions are instance-wide                         |
| `serveme_tf.*`                                                            | global           | server pool is shared across modes                                  |
| `tf2_quick_server.*`                                                      | global           |                                                                     |
| `discord.*`, `misc.*`, `twitchtv.*`                                       | global           |                                                                     |

> Open for review: the queue timeouts (`ready_up_timeout` / `ready_state_timeout`
> / `pre_ready_up_timeout`) are marked global conservatively — if reviewers
> prefer, the inherited-override mechanism can make them per-mode later.

### Mechanism

- **Global** keys: unchanged.
- **Per-gamemode / inherited** keys: the stored config key is namespaced by
  gamemode. `configuration.get(key, gamemode)` resolves: per-gamemode value →
  (for inherited) merge over the global base → schema default.

---

## Enabled gamemodes

**Decision: env var, super-user/ops controlled.**

```
ENABLED_GAMEMODES=6v6,9v9,bball   # replaces QUEUE_CONFIG
```

Rationale: which gamemodes exist on an instance has data, map-pool, whitelist and
server-compatibility implications. Toggling it at runtime creates ugly edge cases
(in-flight queues/games for a mode being disabled, orphaned historical
skill/stats). The enabled set is stable per instance, so it belongs to ops, like
the old `QUEUE_CONFIG`.

What stays dynamic (admin-editable at runtime) is each enabled mode's **settings**
(default skill, whitelist, map pool, extra commands) via the per-gamemode
configuration above. So: **env defines the universe; config tunes each mode.**

`QUEUE_CONFIG` is removed; a single-value `ENABLED_GAMEMODES=6v6` reproduces
today's behaviour. The first entry is treated as the instance default
(pre-selected queue tab, atlas heartbeat primary).

---

## UI

A reusable gamemode-tabs component appears wherever gamemode matters:

- **Queue page** — tabs select exactly one active gamemode; the page shows that
  mode's slots/map-vote/state. No "All" option here.
- **Game list** — "All gamemodes" + per-mode tabs (filter).
- **Player profile** — per-gamemode skill/ELO/stats, with "All" summary.
- **Admin toolbox (player skill editor)** — per-gamemode skill grids.
- **Admin panel (configuration)** — per-gamemode sections for the per-gamemode /
  inherited keys.
- **Hall of fame / statistics** — per-gamemode leaderboards.

Exact visual design of the tab component is TBD (tracked separately).

---

## Events & logs

Every queue/game event payload that currently implies "the" queue gains a
`gamemode` field: `queue/slots:updated`, `queue/state:updated`,
`queue/mapOptions:reset`, `queue/mapVoteResults:updated`, `queue/friendship:*`,
`queue:cleared`, `queue:playerKicked`, and `game:created` (game already carries
it via the model). Consumers (discord notifications, `sync-clients`, queue
metrics, launch wiring) are updated to read it. Structured logs add a `gamemode`
field where a queue/game is in scope.

---

## Migrations

### A. Per-instance backfill (Umzug migration, runs on every instance)

Small, deterministic, idempotent. Uses the instance's previous `QUEUE_CONFIG`
(`currentGamemode`) as the single existing gamemode `g0`. Implemented in
`024-multi-gamemode-backfill.ts` (Phase 1):

1. Set `gamemode = g0` on all existing games.
2. Re-nest player `skill`/`elo` under `g0`; tag each `eloHistory` /
   `skillHistory` entry with `gamemode = g0`.
3. Re-nest `stats.gamesByClass` under `g0`; set `gamesByGamemode = { g0: totalGames }`.

Idempotency is by shape detection: a flat class-keyed map is migrated, an
already-gamemode-keyed map is skipped, so re-runs (and fresh databases) are
no-ops.

Deferred to later phases (each ships its own migration alongside the schema
change that needs it):

- Tag `queue.*` collections with `gamemode = g0` — **Phase 2** (when the queue
  collections gain the discriminator).
- Move per-gamemode config values (`default_player_skill`, `whitelist_id`,
  `player_skill_threshold`, `map_cooldown`, map pool) under the `g0` namespace —
  **Phase 3** (when configuration resolution becomes gamemode-aware).

### B. Cross-instance merger (standalone ops script, run once)

Merges a secondary instance's DB (e.g. `hl` 9v9) into the primary
(`tf2pickup.eu`, now 6v6+9v9). **Not** an Umzug migration — a one-off,
reviewed, dry-run-able script. After both instances have run migration A:

1. **Re-sequence games.** Take all games from all merged instances, order by
   launch date, assign fresh sequential `number`s. On each game set
   `legacy = { gamemode, number: <oldNumber> }`. Index `{ 'legacy.gamemode': 1,
'legacy.number': 1 }`.
2. **Merge players** by `steamId`: union per-gamemode skill/elo/stats (disjoint
   gamemode keys, so no class-level conflict). Reconcile profile fields with
   **primary instance wins** — **except `roles`, which are unioned** (an admin on
   `hl.tf2pickup.eu` keeps their authority after merging into the 6v6 instance).
3. **Merge maps** per gamemode; merge per-gamemode configuration.
4. **Rewrite references** to game numbers (logs, activity log, etc.) using the
   remap table.

### Backward-compatible game URLs

`GET /games/:number?old_gamemode=<g>`: if `old_gamemode` is present, look up
`{ legacy.gamemode: g, legacy.number: number }` and 302 to the new
`/games/:newNumber`. Without the param, `:number` is the new global number.

---

## Phased delivery

Each phase is independently shippable and keeps the app green.

1. **Phase 1 — data model + migration A.** Introduce `Gamemode`; add `gamemode`
   to games; restructure player skill/elo/stats; per-instance backfill migration.
   App still runs a single enabled gamemode. Highest data risk → land and verify
   first.
2. **Phase 2 — multi-queue backend.** Discriminate queue collections; parameterize
   the state machine, locks, reset, map vote, friendships and launch wiring by
   gamemode. `ENABLED_GAMEMODES` accepted (still typically one).
3. **Phase 3 — configuration & maps.** Per-gamemode / inherited config resolution;
   per-gamemode map pools and whitelist; admin panel sections.
4. **Phase 4 — UI.** Gamemode tabs across queue, game list, profiles, hall of
   fame, statistics; events/logs carry gamemode.
5. **Phase 5 — merger tooling.** Cross-instance merge script + `old_gamemode`
   redirect; dry-run + rehearsal against a copy of production data.

---

## Testing strategy

Each phase ships with the tests that can meaningfully cover it. Multi-gamemode
behaviour only becomes user-visible from Phase 2 onward, so the bulk of the new
**e2e** coverage lands then; Phase 1 is validated by unit tests plus regression
of the existing suite.

### Unit / integration (per phase)

- **Phase 1** ✅ — migration backfill (`024-multi-gamemode-backfill.test.ts`:
  game tagging, flat→nested skill/elo/stats, history tagging, idempotency);
  existing unit suite kept green after the player-model restructure.
- **Phase 2** — per-gamemode queue state machine (two queues advance
  independently; readiness counts are scoped; reset only clears one mode).
- **Phase 3** — config resolution (per-gamemode override, inherited
  global+override merge, global passthrough); per-gamemode whitelist in
  `configure.ts`.
- **Phase 5** — merger transform (game renumbering by launch date, legacy map,
  player union, role union) as pure-function unit tests over fixture DBs.

### E2E (Playwright, `tests/`)

**Current harness shape.** `test.yml` runs a matrix
`queue-config: ['6v6', '9v9'] × shard: 1..8`. For each value it boots a separate
**single-gamemode** app with `QUEUE_CONFIG=<config>` and runs only the specs
tagged for it via `--grep @<config>` (specs carry tags like
`@6v6 @9v9` in their title). So today "multi-gamemode" coverage is really two
isolated single-mode apps.

**Approach.** Keep the existing per-config matrix entries (they still validate a
single-mode deployment, which remains a supported configuration). Add a **third
matrix entry** that boots one app with **both** modes enabled and runs the
multi-gamemode specs:

- Replace the env wiring so the matrix value maps to `ENABLED_GAMEMODES`
  (`6v6` → `ENABLED_GAMEMODES=6v6`, etc.) and add a `multi` value →
  `ENABLED_GAMEMODES=6v6,9v9`. Tag cross-mode specs `@multi`.

- **Fixture work**
  - Extend `tests/data.ts` with enough users to fill a 9v9 queue (18 players)
    alongside the existing 6v6 set.
  - Teach `tests/pages/queue.page.ts` about the gamemode tab selector and
    `tests/queue-slots.ts` to enumerate slots for the active gamemode.
  - `tests/game-server-simulator.ts` / `fixtures/launch-game.ts` to launch a
    game for a specified gamemode.
  - A helper to assert a player's per-gamemode skill/stats on the profile page.

- **New `@multi` specs (land with the phase that makes them pass)**
  - `tests/10-queue/` — switch gamemode tab updates the visible queue; joining
    6v6 then switching to 9v9 and joining **moves** the player (one queue at a
    time); a full 9v9 queue launches a 9v9 game; map vote uses the 9v9 pool.
  - `tests/20-game/` — a launched 9v9 game shows `gamemode` and ranks its
    players' 9v9 skill/ELO independently of their 6v6 values.
  - `tests/00-misc/` or a new `tests/50-gamemodes/` — game list filters by
    gamemode ("All" + per-mode); a player profile shows separate per-gamemode
    skill/stats tabs; hall of fame is per-gamemode.
  - `tests/90-admin/` — admin skill editor edits a chosen gamemode's skill
    without touching the others; per-gamemode config sections persist
    independently; skill CSV import/export round-trips per gamemode.
  - **Merger** (Phase 5) — integration test over two seeded databases asserting
    renumbering, `?old_gamemode=` redirect, and merged role union.

## Risks & open questions

- **Skill on merge between _enabled_ modes is disjoint, so safe.** But when a
  previously single-mode instance later _enables a new_ mode, players start
  unranked there — confirm that's acceptable (it matches "provisional" ELO).
- Concurrent launches across modes increase simultaneous gameserver demand;
  verify assignment handles contention (shared static + serveme.tf pool).
- Queue timeout scoping (global vs per-mode) — see config table note.

---

## Checklist (living)

- [x] Phase 1: `Gamemode` type + configs registry keyed by gamemode
- [x] Phase 1: games `gamemode` (+ `legacy`) field + `create.ts` / `launch-game.ts`
- [x] Phase 1: player skill/elo/stats restructure + all consumers
- [x] Phase 1: migration A (`024-multi-gamemode-backfill`) + unit test
- [x] Phase 2: queue collections discriminator + scoped queries
- [x] Phase 2: per-gamemode state machine, locks, reset, launch wiring
- [x] Phase 2: `ENABLED_GAMEMODES` env (`QUEUE_CONFIG` kept as deprecated single-mode alias)
- [x] Phase 3: per-gamemode/inherited config resolution (`get/set/reset(key, gamemode?)`, composite-key storage)
- [x] Phase 3: per-gamemode map pools + whitelist (admin per-gamemode config/pool UI sections deferred to phase 4)
- [x] Phase 4: gamemode tabs component
- [x] Phase 4: per-gamemode game list (filter + tabs), hall of fame, player profile, per-game slot layout
- [x] Phase 4: events + logs gamemode param (queue events carry gamemode; game-scoped logs include it)
- [ ] Phase 4 (remaining): live **queue-page** gamemode selector — needs per-gamemode WS
      room routing (the gateway matches `currentUrl` exactly and sync-clients
      broadcasts to `{ url: '/' }`, so a `/?gamemode=` URL would misroute live
      updates) and a `@multi` (`ENABLED_GAMEMODES=6v6,9v9`) e2e matrix entry to
      validate it. The single-mode queue page is unchanged and correct.
- [ ] Phase 4 (remaining): admin per-gamemode config + skill-editor sections
      (config resolution and storage already support it from phase 3; the bare
      key still edits the default gamemode).
- [x] Phase 5: cross-instance merger script (`src/merge-instances/`: pure
      `renumberGames` + `mergePlayers` transforms with unit tests, plus a
      dry-run-able `run.ts` that folds maps, per-gamemode config and logs.tf
      references in)
- [x] Phase 5: `old_gamemode` redirect (`GET /games/:n?old_gamemode=<g>` → 301)
- [x] Docs: `sample.env` documents `ENABLED_GAMEMODES`
