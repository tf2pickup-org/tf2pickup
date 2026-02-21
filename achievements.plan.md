# Achievement System

## Context

Players currently have no progression system beyond raw game counts on their profile. An achievement system gives players incentives to play more, try different roles, be reliable (join servers quickly, don't disconnect), and take substitute spots. Achievements are public on profiles and players get a toast notification on unlock.

## Achievement Definitions

Static array in code. Each has: `id`, `name`, `description`, `tier` (bronze/silver/gold/australium).

### Games played

| ID                  | Name              | Description        | Tier       |
| ------------------- | ----------------- | ------------------ | ---------- |
| `first-blood`       | First Blood       | Play your first game | bronze     |
| `mercenary`         | Mercenary         | Play 100 games     | bronze     |
| `grizzled-veteran`  | Grizzled Veteran  | Play 250 games     | silver     |
| `f2p-no-more`       | F2P No More       | Play 1000 games    | gold       |
| `australium-legend` | Australium Legend  | Play 5000 games    | australium |

### Class-specific

| ID             | Name                                          | Description                | Tier   |
| -------------- | --------------------------------------------- | -------------------------- | ------ |
| `ze-healing`   | Ze Healing Is Not As Rewarding As Ze Hurting  | Play 100 games as medic    | bronze |
| `ubermensch`   | Übermensch                                    | Play 500 games as medic    | silver |
| `grasshopper`  | Grasshopper                                   | Play 500 games as scout    | silver |
| `maggots`      | Maggots!                                      | Play 500 games as soldier  | silver |
| `kabooom`      | Kabooom!                                      | Play 500 games as demoman  | silver |

### Substitute

| ID                  | Name                        | Description                    | Tier   |
| ------------------- | --------------------------- | ------------------------------ | ------ |
| `reinforcements`    | Reinforcements Have Arrived | Join a game as a substitute    | bronze |
| `mann-co-reserve`   | Mann Co. Reserve            | Join 10 games as a substitute  | silver |

### Server join speed

| ID                       | Name                  | Description                                                  | Tier   |
| ------------------------ | --------------------- | ------------------------------------------------------------ | ------ |
| `need-a-dispenser-here`  | Need A Dispenser Here | Join the game server within 1 minute of it being ready 50 times | silver |

### No disconnects

| ID             | Name          | Description                                        | Tier   |
| -------------- | ------------- | -------------------------------------------------- | ------ |
| `iron-mann`    | Iron Mann     | Complete 10 games without disconnecting from the server | silver |
| `mann-of-steel`| Mann of Steel | Complete 50 games without disconnecting            | gold   |

### Top DPM (logs.tf stats)

| ID                   | Name                     | Description                                | Tier       |
| -------------------- | ------------------------ | ------------------------------------------ | ---------- |
| `top-damage-dealer`  | Top Damage Dealer        | Have the highest DPM in a game 10 times    | bronze     |
| `pain-train`         | Pain Train               | Have the highest DPM in a game 100 times   | silver     |
| `australium-rl`      | Australium Rocket Launcher | Have the highest DPM in a game 1000 times | australium |

### High HPM (logs.tf stats)

| ID                 | Name                  | Description                                          | Tier       |
| ------------------ | --------------------- | ---------------------------------------------------- | ---------- |
| `quick-fix`        | Quick-Fix             | Heal more than 1200 HPM in a game                    | bronze     |
| `miracle-worker`   | Miracle Worker        | Heal more than 1200 HPM in 10 games                  | silver     |
| `mannpower-medic`  | Mannpower Medic       | Heal more than 1200 HPM in 100 games                 | australium |

## Database Model

New collection: `playerachievements` (single document per player)

```ts
// src/database/models/player-achievement.model.ts
interface PlayerAchievementModel {
  player: SteamId64
  achievements: PlayerAchievement[] // unlocked achievements
  progress: AchievementProgress     // counters for multi-game tracking
}

interface PlayerAchievement {
  achievementId: string
  unlockedAt: Date
}

interface AchievementProgress {
  substituteGames: number
  quickJoins: number
  gamesWithoutDisconnect: number
  topDpmGames: number
  highHpmGames: number
}
```

Index: `{ player: 1 }` unique.

## Logs.tf Stats Fetching

The app already uploads game logs to logs.tf and stores the resulting URL in `game.logsUrl` (see `src/logs-tf/`). However, the app does **not** currently fetch stats back from logs.tf. For the DPM and HPM achievements we need to parse the logs.tf JSON API response.

### logs.tf JSON API

Each uploaded log has a JSON endpoint at `https://logs.tf/json/<log_id>`. The response includes per-player stats keyed by SteamID3. Relevant fields:

```
GET https://logs.tf/json/1234567
{
  "length": 1800,           // match duration in seconds
  "players": {
    "[U:1:12345]": {        // SteamID3 format
      "dmg": 54000,         // total damage dealt
      "heal": 36000,        // total healing done (only relevant for medics)
      ...
    },
    ...
  }
}
```

- **DPM** = `player.dmg / (length / 60)`
- **HPM** = `player.heal / (length / 60)`
- The player with the highest DPM across all players in the match gets the "top DPM" credit.
- Any medic with HPM > 1200 gets the "high HPM" credit.

### Implementation: `src/logs-tf/fetch-logs-tf-stats.ts`

New file to fetch and parse the logs.tf JSON response:

- Extract log ID from the stored `logsUrl` (e.g. `https://logs.tf/1234567` → `1234567`)
- Fetch `https://logs.tf/json/{logId}`
- Validate response with a Zod schema (at minimum: `length`, `players` map with `dmg` and `heal` per player)
- Convert SteamID3 keys (`[U:1:12345]`) to SteamId64 to match our player model
- Return a typed result with per-player DPM and HPM values

### Integration with achievement checking

The `award-achievements` plugin (step 3 below) calls this fetch function after `game:ended` for games that have a `logsUrl`. Since logs are uploaded asynchronously after match end, the achievement check for logs.tf-based achievements should be scheduled with a delay (or triggered after the `logsUrl` is set on the game document).

**Option:** listen for when `logsUrl` is written to the game (a new event `game:logsUploaded` emitted from the logs-tf plugin after successful upload) and run the logs.tf achievement checks at that point, separately from the main `game:ended` achievement check.

## File Structure

```
src/achievements/
  achievement.ts              # Achievement type + AchievementTier enum
  achievements.ts             # Static array of all achievement definitions
  index.ts                    # Module exports (byPlayer, etc.)
  plugins/
    award-achievements.ts     # Listens to game:ended, checks & awards
    award-logs-achievements.ts # Listens to game:logsUploaded, checks DPM/HPM achievements
  views/html/
    player-achievements.tsx   # Profile section component
    achievement-badge.tsx     # Single badge component
src/logs-tf/
  fetch-logs-tf-stats.ts      # Fetch & parse logs.tf JSON API
```

## Implementation Steps

### 1. Types & definitions

- `src/achievements/achievement.ts` — `Achievement` interface, `AchievementTier` enum
- `src/achievements/achievements.ts` — static array of all 20 achievements

### 2. Database model & collection

- `src/database/models/player-achievement.model.ts` — model interfaces
- Add to `src/database/collections.ts` — `playerAchievements` collection
- Add to `src/database/ensure-indexes.ts` — unique index on `player`

### 3. Achievement checking plugin (game-based)

`src/achievements/plugins/award-achievements.ts`

- Listens to `game:ended` (guarded by `game.state === GameState.ended`)
- For each active slot player:
  - Read player stats (compute `totalGames + 1` to avoid race with `update-player-stats`)
  - Read/upsert player achievement document
  - Check each achievement's criteria:
    - **Games played:** `totalGames + 1 >= threshold`
    - **Class-specific:** `gamesByClass[class] + 1 >= threshold` (if current game class matches)
    - **Substitute:** check `PlayerReplaced` events where `replacement === player`; increment `progress.substituteGames`
    - **Quick join:** find `GameServerInitialized` and `PlayerJoinedGameServer` events, compare timestamps (delta < 60s)
    - **No disconnect:** check no `PlayerLeftGameServer` for this player without a subsequent `PlayerJoinedGameServer`; update `progress.gamesWithoutDisconnect`
  - Push newly unlocked achievements via `$push` + update `$set` for progress

### 4. Logs.tf stats fetching

- `src/logs-tf/fetch-logs-tf-stats.ts` — fetch JSON from logs.tf, parse with Zod, convert SteamID3 → SteamId64, return per-player DPM/HPM
- Add `game:logsUploaded` event to `src/events.ts` — emitted from `src/logs-tf/plugins/index.ts` after successful upload
- SteamID3 conversion utility (or use existing library if available)

### 5. Achievement checking plugin (logs.tf-based)

`src/achievements/plugins/award-logs-achievements.ts`

- Listens to `game:logsUploaded`
- Fetches logs.tf stats for the game
- For each player in the game:
  - **Top DPM:** determine which player had the highest DPM; increment that player's `progress.topDpmGames`
  - **High HPM:** check if the player's HPM > 1200; if so increment `progress.highHpmGames`
- Award corresponding achievements when thresholds are met

### 6. Toast notification on unlock

- Use the existing WebSocket/event system to push a notification when new achievements are awarded
- The `game:ended` / `game:logsUploaded` handlers, after computing new achievements, emit an event (or directly push via SSE/WS) for each player with new unlocks
- Client-side toast component in `src/html/@client/` to display the notification

### 7. Profile page display

- `src/achievements/views/html/player-achievements.tsx` — fetches player achievements, renders grid of badges
- `src/achievements/views/html/achievement-badge.tsx` — individual badge with tier-colored styling, name, tooltip with description + unlock date
- Integrate into `src/players/views/html/player.page.tsx` — add `<PlayerAchievements>` between AdminToolbox and gameList div

### 8. Module index

- `src/achievements/index.ts` — exports `byPlayer` function for fetching a player's achievements

### 9. Migration: backfill existing players

`src/migrations/015-backfill-player-achievements.ts`

- Iterate all players, query their game history, compute achievements and progress counters
- For logs.tf-based achievements: fetch stats from logs.tf for all games that have a `logsUrl` (rate-limit API calls)
- Upsert into `playerachievements` collection

## Critical Files to Modify

- `src/database/collections.ts` — add collection
- `src/database/ensure-indexes.ts` — add index
- `src/events.ts` — add `game:logsUploaded` event
- `src/logs-tf/plugins/index.ts` — emit `game:logsUploaded` after successful upload
- `src/players/views/html/player.page.tsx` — integrate achievements section

## Verification

- Run `pnpm test` after writing unit tests for achievement checking logic
- Start dev server with `docker-compose up -d mongo && pnpm dev`
- Play through game lifecycle and verify achievements appear on profile
- Check toast notification appears on achievement unlock
- Verify logs.tf-based achievements trigger correctly after log upload
