import htmx from './htmx.js'
import { onLoadWithAttr } from './on-load-with-attr.js'

const attrName = 'data-offline-alert'

function init(element: HTMLElement) {
  if (element.dataset['offlineAlertInitialized'] === 'true') return

  element.dataset['offlineAlertInitialized'] = 'true'

  htmx.on('htmx:wsClose', () => {
    element.style.display = ''
  })

  htmx.on('htmx:wsOpen', () => {
    element.style.display = 'none'
  })
}

onLoadWithAttr(attrName, init)
