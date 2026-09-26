# Global game numbering with a merge remap table

With multi-queue, a game gained a `gamemode` (and the queue it was launched from), but
`GameModel.number` stays a **single global sequence**, unique across queues and gamemodes, rather
than making a game's identity the composite `(gamemode, number)`. Two instances that used to run
separately (e.g. `tf2pickup.eu` and `hl.tf2pickup.eu`) each number their games `1..N`, so merging
them (`src/merge-instances/run.ts`) renumbers every incoming game to `max+1…` and records a
`(sourceHost, oldNumber) → newNumber` remap so old links still resolve.

## Considered options

- **Composite `(gamemode, number)` identity**: each gamemode keeps its own `1..N` counter, so a
  merge imports games unchanged. Rejected: `number` stops being unique on its own, so every games
  query, the `activeGame` pointer and the game URL (`/games/:number`) would have to carry the
  gamemode, changing the URL of every existing game and every external link.
- **Global sequence, renumbered on merge** (chosen): game URLs and `activeGame` stay number-only;
  only the merge pays for it.

## Consequences

- The merge rewrites every reference to an incoming game's number: `games.roundprogress`,
  `games.substituterequests`, `games.deferredkicks`, `logstf.logs`, `activitylog`, and the players'
  skill and elo history. It runs once, during downtime, with no games in progress, so there is no
  live `activeGame` to rewrite.
- Old links to the merged-in instance resolve through `games.numberremap` two ways: by the `Host`
  header while its old domain still points at the merged app, and by `/games/:number?i=<sourceHost>`
  once that domain is retired. Either answers with a 301 to the game's new number.
- A plain `/games/:number` on the primary keeps working unchanged: its own games keep their numbers.
