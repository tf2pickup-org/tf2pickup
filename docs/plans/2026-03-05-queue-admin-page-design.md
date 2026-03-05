# Queue Admin Page — Design

**Date:** 2026-03-05

## Overview

Create a new "Queue" admin panel page at `/admin/queue` that hosts queue-related configuration settings. Initially contains the map vote timing settings moved from the Scramble maps page.

## Admin sidebar

- **Key:** `queue`
- **Title:** `Queue`
- **Icon:** `IconBrowser`
- **Section:** `Configuration`

## New page (`/admin/queue`)

Form with GET + POST handlers:

- `queue.map_vote_timing` — radio buttons (Pre-ready / Post-ready)
- `queue.map_vote_timeout` — number input (seconds, stored as ms)
- Save button

## Scramble maps page (after)

Reverts to its original state: map vote options display + Scramble button only. No settings form, no POST handler.

## Files changed

| File | Action |
|------|--------|
| `src/admin/views/html/admin.tsx` | Add `queue` to `adminPages` with `IconBrowser` |
| `src/admin/queue/views/html/queue.page.tsx` | New page component |
| `src/routes/admin/queue/index.ts` | New GET + POST route |
| `src/admin/scramble-maps/views/html/scramble-maps.page.tsx` | Remove settings form, revert to non-async |
| `src/routes/admin/scramble-maps/index.tsx` | Remove POST handler |
