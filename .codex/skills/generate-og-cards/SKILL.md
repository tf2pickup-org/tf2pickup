---
name: generate-og-cards
description: Regenerate the static branded social/OpenGraph cards in public/og-image.png and public/branding/*/og-image.png by compositing each logo onto bg.png at 1200x630. Use when a logo or bg.png changes, a branding instance is added, or static OG fallback cards need refreshing.
---

# Generate static branded OG cards

The static `1200x630` social card at `/og-image.png` is the default `og:image` and the fallback when dynamic game or player card rendering fails. Static serving checks branding directories before `public/`, so each branding instance with a `logo.png` needs its own committed `og-image.png`.

The generator cover-crops `public/bg.png` and centers a logo scaled to fit `760x220`.

## Regenerate cards

Require ImageMagick (`magick`; for example, `brew install imagemagick`). From any repository directory, run:

```bash
.codex/skills/generate-og-cards/scripts/generate-og-cards.sh
```

It regenerates the default card and one card for each `public/branding/*/` directory containing `logo.png`.

## Verify and commit

- Visually inspect `public/og-image.png` and at least one branded output; the logo must be centered and legible.
- Stage the changed `og-image.png` assets. `pnpm build` copies `public/` to `dist/public` automatically.
- Do not use this for dynamic per-game or per-player cards; those are generated at request time in `src/og-image/`.
