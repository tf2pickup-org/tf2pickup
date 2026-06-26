import { loadImage, type SKRSContext2D } from '@napi-rs/canvas'
import { ogLogoPath } from './og-logo-path'

// draws the (branding-aware) site logo in the top-left corner
export async function drawOgLogo(ctx: SKRSContext2D) {
  try {
    const logo = await loadImage(ogLogoPath())
    const logoHeight = 56
    const logoWidth = (logo.width / logo.height) * logoHeight
    ctx.drawImage(logo, 64, 56, logoWidth, logoHeight)
  } catch {
    // logo is optional
  }
}
