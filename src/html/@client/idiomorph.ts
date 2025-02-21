import htmx from './htmx'
import { Idiomorph } from 'idiomorph'

function createMorphConfig(swapStyle: string): { morphStyle?: unknown } | undefined {
  if (swapStyle === 'morph' || swapStyle === 'morph:outerHTML') {
    return { morphStyle: 'outerHTML' }
  } else if (swapStyle === 'morph:innerHTML') {
    return { morphStyle: 'innerHTML' }
  } else if (swapStyle.startsWith('morph:')) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
    return Function('return (' + swapStyle.slice(6) + ')')()
  }
}

htmx.defineExtension('morph', {
  isInlineSwap: function (swapStyle) {
    const config = createMorphConfig(swapStyle)
    return config?.morphStyle === 'outerHTML' || config?.morphStyle == null
  },
  handleSwap: function (swapStyle, target, fragment) {
    const config = createMorphConfig(swapStyle)
    if (config && fragment.hasChildNodes()) {
      return Idiomorph.morph(target, fragment.childNodes, config)
    }
    return false
  },
})
