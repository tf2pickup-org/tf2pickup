import htmx from './htmx.js'

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

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute(attrName)) {
    init(element)
  }

  element.querySelectorAll(`[${attrName}]`).forEach(element => {
    if (element instanceof HTMLElement) {
      init(element)
    }
  })
})
