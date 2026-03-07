# Design: Time Span Combo Box for Game Launches Per Day

## Overview

Add a time span dropdown to the "Game launches per day" statistics chart, allowing users to switch between last week, last month, and last year views. The selected span is reflected in the URL for bookmarking/sharing.

## Approach

HTMX partial update with `hx-push-url`. The `<select>` triggers a fragment-only re-render of the chart component via `hx-get`, swapping `outerHTML` of the container. Identical pattern to `WinLossChart`.

## Time Spans

| Value   | Display window |
|---------|---------------|
| `week`  | 7 days        |
| `month` | 30 days (default) |
| `year`  | 365 days      |

## Data & Routing

- **New route**: `GET /statistics/game-launches-per-day?span=<value>` — returns the `GameLaunchesPerDay` fragment (detected via `hx-request` header).
- **Existing route**: `GET /statistics` — passes `?span` query param to `StatisticsPage` → `GameLaunchesPerDay` for correct initial render.
- `getGameLaunchesPerDay(since: Date)` — no changes needed; caller computes `since` from span.
- `toChartData` — updated to accept a `span` parameter to set the display window.

## Component

`GameLaunchesPerDay` accepts a `span?: 'week' | 'month' | 'year'` prop (defaults to `'month'`).

Outer `<div id="game-launches-per-day-container">` wraps everything for `outerHTML` swap target.

The heading row is a flex container with the title and a `<select>`:

```tsx
<select
  hx-get="/statistics/game-launches-per-day"
  hx-target="#game-launches-per-day-container"
  hx-swap="outerHTML"
  hx-push-url="true"
  name="span"
>
  <option value="week" selected={span === 'week'}>last week</option>
  <option value="month" selected={span === 'month'}>last month</option>
  <option value="year" selected={span === 'year'}>last year</option>
</select>
```

HTMX triggers on `change` for `<select>` by default — no submit button needed.
