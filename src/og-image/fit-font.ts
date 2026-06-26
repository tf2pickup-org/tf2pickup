import { type SKRSContext2D } from '@napi-rs/canvas'

// sets the Satoshi font on ctx, shrinking from basePx down to minPx until text fits maxWidth
export function fitFont(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  basePx: number,
  minPx: number,
) {
  let px = basePx
  ctx.font = `${weight} ${px}px Satoshi`
  while (px > minPx && ctx.measureText(text).width > maxWidth) {
    px -= 2
    ctx.font = `${weight} ${px}px Satoshi`
  }
}
