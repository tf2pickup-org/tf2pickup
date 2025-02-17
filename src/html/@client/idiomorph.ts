import htmx from './htmx'
import { Idiomorph } from 'idiomorph'

function createMorphConfig(swapStyle: string) {
  if (swapStyle === 'morph' || swapStyle === 'morph:outerHTML') {
    return { morphStyle: 'outerHTML' }
  } else if (swapStyle === 'morph:innerHTML') {
    return { morphStyle: 'innerHTML' }
  } else if (swapStyle.startsWith('morph:')) {
    return Function('return (' + swapStyle.slice(6) + ')')()
  }
}

htmx.defineExtension('morph', {
  isInlineSwap: function (swapStyle) {
    let config = createMorphConfig(swapStyle)
    return config?.morphStyle === 'outerHTML' || config?.morphStyle == null
  },
  handleSwap: function (swapStyle, target, fragment) {
    let config = createMorphConfig(swapStyle)
    if (config && fragment.hasChildNodes()) {
      return Idiomorph.morph(target, fragment.childNodes, config)
    }
    return false
  },
})
