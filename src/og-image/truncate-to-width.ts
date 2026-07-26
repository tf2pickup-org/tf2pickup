import { type SKRSContext2D } from '@napi-rs/canvas'

// trims text (with the current font) until it fits maxWidth, appending an ellipsis
export function truncateToWidth(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }
  let truncated = text
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}
