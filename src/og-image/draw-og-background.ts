import { type Image, type SKRSContext2D } from '@napi-rs/canvas'
import { ogImageSize } from './og-image-size'

// fills the solid base color, then covers it with the image (if any) preserving aspect ratio
export function drawOgBackground(ctx: SKRSContext2D, image?: Image) {
  const { width, height } = ogImageSize
  ctx.fillStyle = '#221d24'
  ctx.fillRect(0, 0, width, height)
  if (image) {
    const scale = Math.max(width / image.width, height / image.height)
    const w = image.width * scale
    const h = image.height * scale
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h)
  }
}
