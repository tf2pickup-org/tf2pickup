---
name: generate-og-cards
description: Regenerate the static branded social/OpenGraph cards — public/og-image.png and one per branding instance — by compositing each instance's logo onto the site background (bg.png) at 1200x630. Use when a logo or bg.png changes, a new branding instance is added under public/branding/, or the static OG fallback cards need refreshing.
---

# Generating static branded OG cards

The site serves a static `1200x630` social card at `/og-image.png`. It is the default
`og:image` (see `MetaTags` in `src/html/layout.tsx`) **and** the fallback the dynamic
routes redirect to when per-game / per-player rendering fails
(`src/routes/games/:number/og-image.png`, `src/routes/players/:steamId/og-image.png`).

Because static serving checks the branding dir before `public/` (see `@fastify/static`
roots in `src/main.ts`), **each branding instance needs its own card** so previews stay
branding-correct (tf2pickup.fi shows the `.fi` logo, etc.). The files are committed binary
assets:

- `public/og-image.png` — default
- `public/branding/<instance>/og-image.png` — one per instance that has a `logo.png`

## How the card is built

Cover-crop the real site background (`public/bg.png`) to `1200x630`, then composite the
instance logo (scaled to fit `760x220`) centered on top. The logos are light/colored and
already render on the dark navbar, so compositing on the dark background is safe.

## Regenerate them

Requires ImageMagick (`magick`; `brew install imagemagick`). Run from anywhere in the repo:

```bash
.claude/skills/generate-og-cards/scripts/generate-og-cards.sh
```

It regenerates the default card plus one for every `public/branding/*/` that has a
`logo.png`, printing each path it writes.

## After running

- Visually check a couple (e.g. open `public/og-image.png` and one branding card) — the
  logo should be centered and legible on the background.
- These are committed assets; stage and commit the changed `og-image.png` files.
- `pnpm build` copies `public/` into `dist/public`, so no extra wiring is needed.

## When NOT to touch these

The per-game and per-player cards are generated dynamically at request time by
`src/og-image/` + the builders — this skill is **only** for the static fallback/default
cards.
