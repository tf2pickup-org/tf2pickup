import { ogImageSize } from './og-image-size'
import { registerFonts } from './register-fonts'
import { logoPath } from './logo-path'
import { loadImage } from './load-image'
import { drawBackground } from './draw-background'
import { drawLogo } from './draw-logo'
import { truncateToWidth } from './truncate-to-width'
import { fitFont } from './fit-font'
import { ogImageRenderDuration, ogImageFallbacks } from './og-image-metrics'

export const ogImage = {
  size: ogImageSize,
  registerFonts,
  logoPath,
  load: loadImage,
  drawBackground,
  drawLogo,
  truncateToWidth,
  fitFont,
  metrics: {
    renderDuration: ogImageRenderDuration,
    fallbacks: ogImageFallbacks,
  },
} as const
