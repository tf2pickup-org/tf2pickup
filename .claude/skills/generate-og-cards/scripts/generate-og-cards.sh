#!/usr/bin/env bash
# Regenerate the static branded social cards (1200x630 og-image.png) for the default
# site and every branding instance, by compositing each logo onto the site background.
set -euo pipefail

if ! command -v magick >/dev/null 2>&1; then
  echo "error: ImageMagick 'magick' not found — install it (e.g. brew install imagemagick)" >&2
  exit 1
fi

root="$(git rev-parse --show-toplevel)"
public="$root/public"
bg="$public/bg.png"

make_card() {
  local logo="$1" out="$2"
  magick "$bg" -resize 1200x630^ -gravity center -extent 1200x630 \
    \( "$logo" -resize 760x220 \) -gravity center -composite \
    "$out"
  echo "generated ${out#"$root"/}"
}

# default card
make_card "$public/logo.png" "$public/og-image.png"

# one card per branding instance that ships a logo
for dir in "$public"/branding/*/; do
  if [ -f "${dir}logo.png" ]; then
    make_card "${dir}logo.png" "${dir}og-image.png"
  fi
done
