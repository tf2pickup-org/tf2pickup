#!/usr/bin/env bash
# Regenerate static branded social cards (1200x630) from the site background and logos.
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

make_card "$public/logo.png" "$public/og-image.png"

for dir in "$public"/branding/*/; do
  if [ -f "${dir}logo.png" ]; then
    make_card "${dir}logo.png" "${dir}og-image.png"
  fi
done
