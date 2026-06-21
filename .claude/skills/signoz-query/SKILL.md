---
name: signoz-query
description: Query this project's SigNoz observability instance (https://logs.tf2pickup.org) via its REST API — metrics, logs, traces, dashboards, and alert rules. Use when asked to investigate errors/latency, check a metric, search logs, inspect or build dashboards/alerts, or diagnose production behavior of tf2pickup.
---

# Querying SigNoz

The project ships metrics, logs, and traces to a self-hosted SigNoz (v0.100.x, EE) at
`https://logs.tf2pickup.org`. Use it to investigate production behavior.

## Auth

Every request needs the `SIGNOZ-API-KEY` header. The key is in the repo `.env`:

```bash
KEY=$(grep '^SIGNOZ_API_KEY=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
BASE=https://logs.tf2pickup.org
```

Never print, log, or commit the key value.

## The one endpoint you'll use most: `POST /api/v4/query_range`

Drives metrics, logs, and traces. Use **v4**, not v5 (v5 rejects the builder `queryType` field).
Time range is **epoch milliseconds**:

```bash
END=$(($(date +%s%3N))); START=$((END - 6*3600*1000))   # last 6h
```

Body skeleton (swap `dataSource` and the builder query):

```json
{ "start": <ms>, "end": <ms>, "step": <sec>,
  "compositeQuery": {
    "queryType": "builder",
    "panelType": "graph",        // or "table" / "list"
    "builderQueries": { "A": { ...query... } }
  } }
```

### Metrics query (a builderQuery)

```json
{
  "queryName": "A",
  "dataSource": "metrics",
  "expression": "A",
  "disabled": false,
  "aggregateOperator": "sum_rate",
  "aggregateAttribute": {
    "key": "tf2pickup.tasks.execution.count",
    "dataType": "float64",
    "type": "Sum",
    "isColumn": true
  },
  "timeAggregation": "increase",
  "spaceAggregation": "sum",
  "filters": {
    "op": "AND",
    "items": [
      {
        "key": { "key": "result", "dataType": "string", "type": "tag" },
        "op": "=",
        "value": "error"
      }
    ]
  },
  "groupBy": [{ "key": "name", "dataType": "string", "type": "tag" }],
  "stepInterval": 60,
  "reduceTo": "sum"
}
```

- App metrics are named `tf2pickup.*`. Discover them:
  `GET /api/v3/autocomplete/aggregate_attributes?aggregateOperator=count&dataSource=metrics&searchText=tf2pickup`
- Attribute keys / values for a metric:
  `GET /api/v3/autocomplete/attribute_keys?aggregateOperator=count&dataSource=metrics&aggregateAttribute=<metric>&searchText=`
  `GET /api/v3/autocomplete/attribute_values?...&attributeKey=<key>&searchText=`
- **Counters**: `timeAggregation: rate|increase`, `spaceAggregation: sum`.
- **Histograms** expose `.bucket/.count/.sum/.min/.max`. For percentiles, query the `.bucket`
  series with `spaceAggregation: p50|p90|p99` + `timeAggregation: rate`.
- **Gauges**: `timeAggregation/spaceAggregation: max`.

### Logs query

```json
{
  "queryName": "A",
  "dataSource": "logs",
  "expression": "A",
  "disabled": false,
  "aggregateOperator": "noop", // "count" for counts
  "aggregateAttribute": { "key": "", "dataType": "", "type": "" },
  "filters": {
    "op": "AND",
    "items": [
      {
        "key": { "key": "body", "dataType": "string", "type": "" },
        "op": "contains",
        "value": "request completed"
      }
    ]
  },
  "groupBy": [],
  "orderBy": [{ "columnName": "timestamp", "order": "desc" }],
  "limit": 20,
  "offset": 0,
  "pageSize": 20,
  "stepInterval": 60
}
```

Read results from `.data.result[0].list[].data` (fields: `body`, `attributes_string`,
`attributes_number`, `resources_string`, `severity_text`, ...).

Log gotchas:

- **`severity_text` is UPPERCASE**: `INFO`, `WARN`, `ERROR` (filtering `"error"` returns nothing).
- Error objects are flattened to attributes `exception.type` / `exception.message` /
  `exception.stacktrace` (pino→otel bridge in `src/logger.ts`); `msg` becomes `body`.
- Fastify request-completed logs carry numeric attrs `res.statusCode` (float64) and `responseTime`
  (ms). 5xx filter: key `res.statusCode`, type `tag`, op `>=`, value `500`.
- Resource attrs like `service.name` use `"type":"resource"` in filters/groupBy.

### Common ops shortcut

`groupBy` + `panelType:"table"` + `aggregateOperator:"count"` (logs) or `"sum_rate"` (metrics)
gives a quick "top N by X" breakdown. Sum a series total in jq:
`jq -c '.data.result[0].series[] | {labels, total:([.values[].value|tonumber]|add)}'`.

## Dashboards — `/api/v1/dashboards`

- `GET /api/v1/dashboards` — list. Main dashboard: title **tf2pickup**, id
  `019a6e9f-a5e4-7983-9434-e3dd6f7f52b0`.
- `GET /api/v1/dashboards/{id}` — dashboard body is `.data.data`.
- `PUT /api/v1/dashboards/{id}` — body is the inner `.data.data` (title/widgets/layout/variables).
  To add a panel: clone an existing widget of the same `panelTypes` as a template (preserves
  required fields), give it a new `id`, set its query, append to `widgets` **and** `layout`
  (layout `i` must equal the widget `id`). Round-trip a no-op PUT first to confirm body shape.
- Dashboard variable `$instance` (service.name) is referenced in panel filters as
  `service.name = $instance`.

## Alerts — `/api/v1/rules` and `/api/v1/channels`

Threshold rule body:

```json
{ "alert":"<name>",
  "alertType":"METRIC_BASED_ALERT",      // or LOGS_BASED_ALERT / TRACES_BASED_ALERT
  "ruleType":"threshold_rule",
  "evalWindow":"5m0s","frequency":"1m0s",
  "condition":{ "selectedQueryName":"A","op":"1","matchType":"4","target":5,"targetUnit":"",
    "compositeQuery":{ "queryType":"builder","panelType":"graph",
      "builderQueries":{ "A":{ ...same builderQuery as query_range... } } } },
  "labels":{"severity":"warning"},
  "annotations":{"summary":"... {{$labels.<key>}} ...","description":"... {{$value}} ..."},
  "preferredChannels":["discord"] }
```

- `op`: `"1"`=>, `"2"`=<, `"3"`==, `"4"`=!=.
- `matchType`: `"1"`=at least once, `"2"`=all the time, `"3"`=on average, `"4"`=in total.
- A rule **requires** `preferredChannels` (else `400 "at least one channel is required"`).
- `POST /api/v1/testRule` often `500`s ("rule evaluation failed") even for valid rules — just
  create with `POST /api/v1/rules` (returns `{status:"success", data:{id}}`).
- In annotations, label keys are dotted→underscored: `service.name` → `{{$labels.service_name}}`.

Channels:

- `GET /api/v1/channels` / `POST /api/v1/channels`. SigNoz has no native Discord — register Discord
  as a `slack` channel with `slack_configs[].api_url = <discord-webhook>/slack`.
- `POST /api/v1/testChannel` (body = channel config with real `api_url`) sends a live test → `204`.

### Existing rules

- **Scheduled task failures** (`019ee4e4-1b5e-7ca1-b65c-a031d956fd88`) — metric
  `tf2pickup.tasks.execution.count{result=error}`, more than 5 in 5m, grouped by `name`.
- **HTTP 5xx errors** (`019ee513-32f2-70c8-8913-f09ed70c4c96`) — logs `res.statusCode>=500`,
  more than 5 in 5m, grouped by `service.name`.
- Both notify the `discord` channel.

## Tips

- Confirm a metric/field has data (and pick alert thresholds) by running a `query_range` first.
- `service.name` values seen: `tf2pickup-pl`, `tf2pickup-fr`, `tf2pickup-eu`, `tf2pickup-ru`,
  `hl-tf2pickup-eu` (one OTel service per deployed instance).
