import { meter } from '../otel'

export const ogImageRenderDuration = meter.createHistogram('tf2pickup.og_image.render.duration', {
  description: 'Time spent rendering an OG image (excludes the static-card fallback)',
  unit: 'ms',
})

export const ogImageFallbacks = meter.createCounter('tf2pickup.og_image.fallback.count', {
  description: 'Number of times OG image rendering failed and the static card was served',
})
