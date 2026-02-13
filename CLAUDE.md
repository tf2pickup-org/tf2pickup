# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tf2pickup.org — a Team Fortress 2 pick-up game coordination platform. Full-stack Node.js app using Fastify, MongoDB, server-rendered HTML with HTMX.

## Commands

- `pnpm dev` — run dev server with hot reload (tsx --watch)
- `pnpm build` — TypeScript compilation + tsc-alias + asset copy to dist/
- `pnpm lint` — prettier --check + eslint
- `pnpm format` — prettier --write
- `pnpm test` — unit tests (vitest, files in src/)
- `pnpm test -- src/path/to/file.test.ts` — run a single test file
- `pnpm test:e2e` — Playwright e2e tests (requires running app + mongo)
- Docker: `docker-compose up -d mongo` to start MongoDB for development

## Architecture

### Tech Stack

- **Fastify 5** with Zod type provider for request validation
- **MongoDB** (no ORM — raw driver with typed collections in `src/database/collections.ts`)
- **@kitajs/html** for type-safe JSX → HTML server rendering
- **HTMX** for dynamic partial page updates (detects `hx-request` header for fragment responses)
- **Tailwind CSS 4** via PostCSS, embedded at render time
- **esbuild** bundles client-side JS from `src/html/@client/`

### Application Startup (`src/main.ts`)

1. OpenTelemetry init (`src/otel.ts`)
2. Database migrations via Umzug (`src/migrate.ts`)
3. Fastify plugin registration (security, session, HTML, websocket)
4. Auto-load all `**/plugins/**` files, then `**/middleware/**` files, then routes from `src/routes/`

### Module Structure

Feature-driven layout under `src/`. Each module (queue, games, players, admin, etc.) contains:

- Business logic files (e.g., `join.ts`, `leave.ts`)
- `plugins/` — Fastify plugins auto-loaded at startup (event handlers, hooks)
- `middleware/` — request middleware auto-loaded at startup
- `views/html/` — JSX page/component files
- `schemas/` — Zod validation schemas

### Route Registration

Routes live in `src/routes/` and are auto-loaded by `@fastify/autoload` with directory-name prefixes. Route files export default using the `routes()` wrapper from `src/utils/routes.ts`, which provides the Zod type provider:

```ts
export default routes(async app => {
  app.get('/', async (_req, reply) => reply.html(MyPage()))
})
```

### Event System

Typed event emitter in `src/events.ts`. Modules communicate via events (e.g., `game:created`, `queue/slots:updated`, `player:connected`). Plugins subscribe to events.

### Client-Side Code

Browser JS lives in `src/html/@client/`. Files are bundled by esbuild and served via the `serve-bundles` plugin. These files use browser globals and HTMX extensions.

### Database

Collections are exported from `src/database/collections.ts` with TypeScript models in `src/database/models/`. Migrations in `src/migrations/` use Umzug.

### Environment

All env vars are Zod-validated in `src/environment.ts`. See `sample.env` for available variables. Key ones: `MONGODB_URI`, `STEAM_API_KEY`, `QUEUE_CONFIG` (6v6/9v9/bball/ultiduo/test), `WEBSITE_URL`.

## Conventions

- **One export per file** — the exported function name must match the file name (e.g., `foo-bar.ts` → `export function fooBar()`)
- **Conventional commits** for PR titles and commit messages (check git log for examples)
- **Use date-fns helpers** for time durations instead of raw numbers (e.g., `secondsToMilliseconds(1)` not `1000`)
- **Strict TypeScript** — project uses `@tsconfig/strictest`
- **ESM only** — `"type": "module"` in package.json
- **pnpm** as package manager
