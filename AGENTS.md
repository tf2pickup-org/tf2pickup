# tf2pickup.org

Team Fortress 2 pick-up game coordination platform. Full-stack Node.js application using Fastify, MongoDB, server-rendered HTML, and HTMX.

## Commands

- `pnpm dev` — start the development server with hot reload.
- `pnpm build` — compile TypeScript, run `tsc-alias`, and copy assets to `dist/`.
- `pnpm lint` — run Prettier checks and ESLint.
- `pnpm format` — format with Prettier.
- `pnpm test` — run Vitest unit tests.
- `pnpm test -- src/path/to/file.test.ts` — run one test file.
- `pnpm test:e2e` — run Playwright tests; requires the application and MongoDB.
- `docker-compose up -d mongo` — start MongoDB for development.

Before starting a development server or MongoDB, check whether one is already running (for example, ports 3000 and 27017) and reuse it.

## Architecture

- Fastify 5 with the Zod type provider for request validation.
- Raw MongoDB driver with typed collections in `src/database/collections.ts`; models are in `src/database/models/`.
- `@kitajs/html` renders type-safe JSX to HTML; HTMX supplies partial-page updates. Detect the `hx-request` header when serving a fragment.
- Tailwind CSS 4 is processed through PostCSS and embedded at render time.
- esbuild bundles browser code from `src/html/@client/`.

### Startup and modules

`src/main.ts` initializes OpenTelemetry, runs Umzug migrations, registers Fastify plugins, then auto-loads `**/plugins/**`, `**/middleware/**`, and routes in `src/routes/`.

Use the feature-driven structure under `src/`: business logic plus optional `plugins/`, `middleware/`, `views/html/`, and `schemas/` directories. Plugins subscribe to the typed event emitter in `src/events.ts`.

Routes are auto-loaded with directory-name prefixes. Export routes through the `routes()` wrapper from `src/utils/routes.ts`:

```ts
export default routes(async app => {
  app.get('/', async (_req, reply) => reply.html(MyPage()))
})
```

### Database and environment

Add database indexes through `ensureIndexes()` rather than migrations unless specifically asked otherwise. Environment variables are Zod-validated in `src/environment.ts`; consult `sample.env` for `MONGODB_URI`, `STEAM_API_KEY`, `QUEUE_CONFIG`, and `WEBSITE_URL`.

### Observability

OpenTelemetry in `src/otel.ts` sends `tf2pickup.*` metrics, logs, and traces to SigNoz. Use the `signoz-query` skill for production investigations. There are three distinct channels:

- OTel/SigNoz: operational health, outcomes, and diagnostics.
- Umami: per-instance in-browser product analytics via `data-umami-event`.
- tf2pickup telemetry: anonymous cross-instance feature-adoption snapshots in `src/telemetry/build-snapshot.ts`.

Use the framework in `docs/observability.md`. For a new feature, add a snapshot entry for configuration or feature flags, a Umami tag for user-facing interactions, or OTel instrumentation for operational health/outcomes; omit instrumentation when none apply.

## Conventions

- Keep one export per file and match its name to the hyphenated filename (`foo-bar.ts` exports `fooBar`).
- Use conventional commits.
- Use date-fns duration helpers rather than raw time values.
- Use camelCase for all constants; never SCREAMING_SNAKE_CASE.
- Keep TypeScript strict and ESM-only. Use pnpm.
- Adapt third-party code to this project’s styles rather than vendoring it unchanged.
- For production imports, confirm a package is a runtime dependency. Lazy-import optional or development-only modules.
- Avoid barrel imports that cause `environment.ts` to load.
- Disclose non-obvious asset or data transformations.

## Verification

After code changes, run linting, type checking, and relevant tests. For a PR, also watch CI until it is green before considering it complete.
