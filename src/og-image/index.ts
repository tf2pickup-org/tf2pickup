import { ogImageSize } from './og-image-size'
import { registerOgFonts } from './register-og-fonts'
import { ogLogoPath } from './og-logo-path'
import { loadOgImage } from './load-og-image'
import { drawOgBackground } from './draw-og-background'
import { drawOgLogo } from './draw-og-logo'
import { truncateToWidth } from './truncate-to-width'
import { fitFont } from './fit-font'
import { ogImageRenderDuration, ogImageFallbacks } from './og-image-metrics'

export const ogImage = {
  size: ogImageSize,
  registerFonts: registerOgFonts,
  logoPath: ogLogoPath,
  load: loadOgImage,
  drawBackground: drawOgBackground,
  drawLogo: drawOgLogo,
  truncateToWidth,
  fitFont,
  metrics: {
    renderDuration: ogImageRenderDuration,
    fallbacks: ogImageFallbacks,
  },
} as const
