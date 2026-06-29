# Observability & Telemetry

tf2pickup uses three separate systems to understand how the software runs and is used. They answer
different questions, collect different data, and have different privacy and reliability properties.
This document is the reference for deciding **where a new signal belongs** so we don't double
instrument or leak data into the wrong place.

## The three systems at a glance

| System                  | One-line identity                                     | Scope                                   | Origin                     | Unit                    | Privacy                            |
| ----------------------- | ----------------------------------------------------- | --------------------------------------- | -------------------------- | ----------------------- | ---------------------------------- |
| **tf2pickup telemetry** | What is configured and adopted, across every instance | All instances, incl. ones we don't host | Stored server config/state | Per instance            | Anonymous (sha256 of url), non-PII |
| **Umami**               | What users click/do in the browser, per instance      | One instance's end users                | Browser interaction        | Per visitor/session     | Pseudonymous within one instance   |
| **OTel / SigNoz**       | Is the running system healthy, and why                | Only instances we host                  | Server runtime             | Per request/span/metric | Internal infra                     |

A good illustration of the boundary: server-side lifecycle/outcome events (game ended, substitute
filled, abandonment) are deliberately kept **out** of Umami and sent to SigNoz — they must be
reliable and they describe backend state, not browser behaviour.

## tf2pickup telemetry

Anonymous, cross-instance, server-side configuration snapshots. Lives in a
[dedicated service](https://github.com/tf2pickup-org/telemetry); instances report a small non-PII
snapshot on a schedule (opt-out via `TELEMETRY_DISABLED`).

**Goes here** — instance-level, non-PII, low-frequency, answers "how is the software used in the
wild":

- Feature-flag states (`games.skill_suggestions`, voice server type, ETF2L requirement, …) — the
  on/off rate of any experimental flag
- Queue config (6v6/9v9/bball/ultiduo), app version, runtime version bucket
- Integrations enabled (discord, serveme, tf2-quick-server, twitch, logs.tf, umami)
- Usage counters (skill suggestions acted on, admin skill changes, games launched, static servers)
- Scale buckets (registered players, map-pool size) and customization signals (docs edited,
  cooldown levels, default skill, extra commands)
- Maps played / map-pool composition

**Does NOT go here:** anything per-player or per-game, URLs/names/IPs/Steam IDs, anything
operational (errors/latency), anything high-frequency. If it can't be anonymized to an instance
hash, it doesn't belong — the entire value of this channel is being safe-by-construction to collect
from strangers' deployments.

## Umami

Per-instance, in-browser product analytics. Each instance points at its own Umami via
`UMAMI_SCRIPT_SRC` / `UMAMI_WEBSITE_ID` (optional, off by default). Tracked client-side with
`data-umami-event` tags.

**Goes here** — client-side interaction, funnels, engagement, best-effort:

- Pageviews / route navigation
- CTA clicks: join queue, ready-up / not-ready, join game, join voice, copy connect string, map
  votes, chat use
- Funnels: queue → ready → game; `ready-up-shown` → ready/timeout drop-off
- Engagement: logout, external profile links, stream/twitch views
- Session recorder, web-vitals / performance

**Does NOT go here:** anything you must not lose (ad-blockers, opt-out, and client failures drop
events); server-side outcomes; cross-instance aggregation; PII beyond the deliberate per-instance
`identify(steamId)`.

## OTel / SigNoz

Server-side observability for instances we host, shipped via OpenTelemetry to
[SigNoz](https://logs.tf2pickup.org). Must be reliable.

**Goes here** — server runtime, only for our own infra:

- Metrics (`tf2pickup.*`): active games, queue occupancy, request/job latency, DB query times,
  external-API latency (Steam, serveme, logs.tf), error rates
- Logs: structured app logs, warnings/errors, security anomalies
- Traces: request spans, game-launch pipeline, server allocation, end-to-end latency
- Reliable server-side lifecycle/outcome events: game ended, substitute requested/filled,
  abandonment, allocation failures, skill recalcs
- SLOs / alerting / capacity

**Does NOT go here:** other people's instances (we only see our own infra); browser UX clicks;
config of instances we don't host.

## Decision framework

Ask these in order when a new signal appears:

1. **Whose state/behaviour is it?** Every self-hosted instance incl. not ours → telemetry. One
   instance's end users in the browser → umami. Our own infrastructure → otel.
2. **Where does it originate?** Browser interaction → umami. Stored config/state → telemetry.
   Server runtime (request/job/error) → otel.
3. **What's the unit of analysis?** Per instance (adoption %) → telemetry. Per visitor/session
   (funnel) → umami. Per request/span/time-series (health) → otel.
4. **Must it be reliable/complete?** If losing it is unacceptable (outcomes, alerting, anything
   you'd page on) → otel, **never umami**. If best-effort aggregate is fine → umami or telemetry.
5. **Privacy ceiling.** Must be anonymous/non-PII (other people's instances) → telemetry only.
   Pseudonymous within one instance is OK → umami. Internal infra → otel.
6. **Cardinality / cost.** One low-frequency snapshot per instance → telemetry. Per-interaction
   (sampling OK) → umami. High-volume with retention/sampling controls → otel.
7. **What decision does it drive?** "Keep/promote/kill a feature ecosystem-wide?" → telemetry.
   "Is the UX working / where do users drop?" → umami. "Is the system healthy / why slow?" → otel.

### Handling overlap

When a signal is tempting in two places, **route by the primary question — don't double
instrument.** The same concept can legitimately split across all three by facet. "Skill
suggestions" is the canonical example:

- **Adoption** (is the flag on, how many admins act on it, across all instances) → telemetry
- **In-browser interaction** (admin clicks the suggestion in the editor) → umami
- **Operational** (did applying it succeed, latency, errors, on our instances) → otel

### Anti-patterns

- Relying on **umami** for anything you must not lose, or for cross-instance coverage (most
  instances won't run it).
- Pushing **per-request / high-cardinality** data into telemetry or umami.
- Expecting **otel** to tell you anything about instances we don't host.
- Putting anything **player-identifiable** into telemetry.
