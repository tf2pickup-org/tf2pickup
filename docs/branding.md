# Branding

Set `WEBSITE_BRANDING=<instance>` to serve files from `public/branding/<instance>/` in place of the same-named files in `public/` (see the `@fastify/static` roots in `src/main.ts`). Common overrides: `logo.png`, `favicon.png`, `favicon.ico` and `og-image.png`.

## Page background

The page background loads a `1920×1080` screenshot of `cp_gullywash` directly from the map thumbnail service. A fixed `body::before` layer in `src/html/styles/main.css` covers the viewport and applies these filters:

```css
filter: grayscale(1) contrast(0.48) sepia(0.29) hue-rotate(200deg) saturate(2) brightness(0.134);
```

The filters affect only the background layer. There are no top or bottom fades. The body's zinc background remains visible if the thumbnail cannot load.

To change the map, edit the background URL in `src/html/styles/main.css`. Any map the thumbnail service knows works; check that `https://mapthumbnails.tf2pickup.org/unsafe/1920x1080/<map>.jpg` returns an image first. This URL is defined in CSS, so `WEBSITE_BRANDING` does not override it.

`public/bg.png` is still used for OpenGraph cards and is separate from the page background.
