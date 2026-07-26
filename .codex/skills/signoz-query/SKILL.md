---
name: signoz-query
description: Query this project's SigNoz observability instance at https://logs.tf2pickup.org through its REST API for metrics, logs, traces, dashboards, and alert rules. Use to investigate tf2pickup production errors or latency, check metrics, search logs, inspect or build dashboards and alerts, or diagnose production behavior.
---

# Query SigNoz

Use the self-hosted SigNoz v0.100.x EE instance at `https://logs.tf2pickup.org` to investigate production behavior. Read `SIGNOZ_API_KEY` from `.env` and send it as `SIGNOZ-API-KEY`; never print, log, or commit the key.

```bash
KEY=$(grep '^SIGNOZ_API_KEY=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
BASE=https://logs.tf2pickup.org
```

## Query data

Use `POST /api/v4/query_range` for metrics, logs, and traces. Use v4 rather than v5. Set `start` and `end` as epoch milliseconds and use builder queries.

For metrics, discover `tf2pickup.*` names using `GET /api/v3/autocomplete/aggregate_attributes?aggregateOperator=count&dataSource=metrics&searchText=tf2pickup`. Discover metric attributes through `attribute_keys` and `attribute_values` autocomplete endpoints. Use `rate` or `increase` plus `sum` for counters, `.bucket` with `p50`, `p90`, or `p99` plus `rate` for histogram percentiles, and `max` for gauges.

For logs, use `dataSource: "logs"`. `severity_text` values are uppercase. Pino error objects are in `exception.type`, `exception.message`, and `exception.stacktrace`; the log message is `body`. Request-completed logs include `res.statusCode` and `responseTime`; filter 5xx responses using `res.statusCode >= 500`. Treat `service.name` as a resource attribute.

Use a table query with `groupBy` and `count` (logs) or `sum_rate` (metrics) for quick top-N breakdowns. Query before selecting an alert threshold.

## Dashboards and alerts

- Use `/api/v1/dashboards` to list, retrieve, and update dashboards. For panel additions, clone an existing compatible widget and add matching entries to both `widgets` and `layout`.
- The main dashboard is titled `tf2pickup`; its instance variable maps to `service.name`.
- Use `/api/v1/rules` and `/api/v1/channels` for alerting. Rules require `preferredChannels`; `POST /api/v1/testRule` may return 500 even for valid rules, so create valid rules directly instead.
- SigNoz has no native Discord channel. Configure a Discord webhook as a Slack channel using its `/slack` endpoint. `testChannel` sends a live message, so only use it when authorized.
- In alert annotations, convert dotted label names to underscores: `service.name` becomes `{{$labels.service_name}}`.

Common deployed service names include `tf2pickup-pl`, `tf2pickup-fr`, `tf2pickup-eu`, `tf2pickup-ru`, and `hl-tf2pickup-eu`.
