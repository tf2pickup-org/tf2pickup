# One global lock for the queue engine

Every queue engine command runs under a single in-process lock shared by all queues, rather than one lock per queue. With one lock there is nothing to resolve before locking (commands addressed by player don't need to find their queue first), and a join that vacates the player's slot in another queue is one atomic critical section. This relies on the app running as a single process.

## Considered options

- **Per-queue locks** (what we had): a command addressed by `steamId` must look up the player's queue outside the lock, lock it, and re-read inside; a cross-queue join spans two critical sections. Rejected for the extra branches it forces on every command.
- **MongoDB transactions / optimistic versioning on the queue state**: needed only if the app ran as several processes; it doesn't.

## Consequences

- Operations on different queues serialize. Baseline before the switch (SigNoz, 7 days to 2026-09-27, per-queue locks): mutex wait p50 ≈ 2.5 ms, p90 ≈ 4.5 ms, p99 5–14 ms on every production instance; the busiest (br) took ~9.8k locks a week. Compare `tf2pickup.queue.mutex_wait.duration` and `tf2pickup.queue.mutex_hold.duration` (both by `operation`; the `queue` attribute is gone with the per-queue locks) against this.
- If waits climb, go back to per-queue locks with resolve → lock → re-read for commands addressed by player.
