# Branding

Set `WEBSITE_BRANDING=<instance>` to serve files from `public/branding/<instance>/` in place of the same-named files in `public/` (see the `@fastify/static` roots in `src/main.ts`). Common overrides: `logo.png`, `favicon.png`, `favicon.ico`, `og-image.png` and `bg.webp`.

## Page background

`public/bg.webp` is a map screenshot with the tint, desaturation and blur baked in; the CSS (`body` in `src/html/styles/main.css`) only adds the top/bottom fade. The default is `cp_gullywash`.

To use a different map for your instance, render it from the map thumbnail service with ImageMagick:

```bash
map=koth_bagel
curl -sf "https://mapthumbnails.tf2pickup.org/unsafe/1920x1080/$map.jpg" \
  | magick - -modulate 100,70 -blur 0x2 -fill '#09090b' -colorize 92 -quality 80 \
    public/branding/<instance>/bg.webp
```

- `-colorize 92` is the zinc-950 overlay strength; lower it to show more of the map.
- `-modulate 100,70` desaturates to 70%; `-blur 0x2` softens the detail so it doesn't compete with the UI.
- Dark, warm, indoor shots work best (`cp_gullywash`, `cp_metalworks`, `cp_steel`, `koth_bagel`, `koth_clearcut`, `pl_vigil`). Busy or sky-heavy shots (`cp_process`, `cp_reckoner`) show through the empty queue slots.
- Any map the thumbnail service knows works; check `https://mapthumbnails.tf2pickup.org/unsafe/<map>.jpg` returns an image first.
