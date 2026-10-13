# Global game numbering with a merge remap table

When the app became multi-gamemode (5.0.0), a game gained a `gamemode` field but we kept
`GameModel.number` as a **single global sequence** — unique across all gamemodes — rather than
making a game's identity the composite `(gamemode, number)`. Because two previously separate
instances (e.g. `tf2pickup.eu` and `hl.tf2pickup.eu`) each number their games `1..N`, the merge
script renumbers every incoming game to `max+1…` and persists a `(sourceHost, oldNumber) →
newNumber` remap so legacy links still resolve.

## Considered options

- **Composite `(gamemode, number)` identity** — each gamemode keeps its own `1..N` counter, so a
  merge imports incoming games unchanged and existing games are simply stamped with their
  gamemode. Rejected because it makes `number` non-unique on its own: every `games` query, the
  `activeGame` pointer, and the game URL (`/games/:number`) would have to carry the gamemode, and
  it changes the game URL shape for all existing games and external links.
- **Global sequence + renumber on merge** (chosen) — game URLs and `activeGame` stay
  `number`-only; only the merge pays a cost.

## Consequences

- The merge is a foreign-key rewrite, not just a field bump: it must renumber the incoming game
  **and** rewrite every reference to it before insert — `games.roundprogress`,
  `games.substituterequests`, `games.deferredkicks`, `gamelogs`, `logstf.logs`. Missing one leaves
  dangling history. This is tolerable because the merge runs once, during full downtime, with no
  games in progress (so there is no live `activeGame` to rewrite).
- Legacy links to the merged-in instance resolve two ways: by the `Host` header while the old
  subdomain still points at the merged app, and by an explicit `/games/:number?i=<sourceHost>`
  override for hand-built links after the subdomain is retired. Both consult the remap table.
- A bare `/games/:number` (own instance, no `?i=`) keeps working unchanged, because only incoming
  games are renumbered.
