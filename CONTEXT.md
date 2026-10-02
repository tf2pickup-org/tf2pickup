# Context

Domain glossary for tf2pickup.org. Terms only — no implementation details.

## Gamemode

A named way of playing that fixes the class layout and team count — the four built-ins are
`6v6`, `9v9`, `ultiduo`, and `bball`. Historically one instance served exactly one gamemode
(chosen at boot via `QUEUE_CONFIG`), and separate subdomains ran separate instances
(`tf2pickup.eu` = 6v6, `hl.tf2pickup.eu` = 9v9). As of the multi-gamemode work an instance
serves several gamemodes at once.

The set of gamemodes is a **fixed code registry** (a closed union of stable string keys), not
runtime-editable by admins. A gamemode's shape is a `QueueConfig` (`teamCount`, always 2, plus
the list of class slots). Compare `Queue`, `Queue Config`.

## Queue

The live roster of open and filled slots for **one gamemode**, together with its ready-up state
and map vote. Each gamemode has its own independent queue. A player may occupy a slot in **at
most one queue at a time** — switching gamemode means leaving one queue and joining another
(there is no simultaneous cross-gamemode queueing). Distinct from `Game`, which is what a full,
readied-up queue launches into.

## Skill

A player's estimated strength, keyed **per (gamemode, class)** — a player's 6v6 scout skill is
a different value from their 9v9 scout skill. Used to balance teams when a game is picked.
(Before multi-gamemode, skill was a single per-class map, because each gamemode lived in its own
instance/database.)

## Merge

The one-off operation of folding an external instance's data into this one — chiefly merging
`hl.tf2pickup.eu` (a 9v9 instance) into `tf2pickup.eu` so the 9v9 data becomes this instance's
`9v9` gamemode. Players are unified by Steam id; the incoming instance's skills land in the
incoming gamemode's `Skill` bucket. `Game` numbers stay a single global sequence, so incoming
games are **renumbered** on merge and a remap `(source host, old number) → new number` is kept so
that legacy links to the old instance still resolve.
