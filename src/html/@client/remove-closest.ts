import htmx from './htmx.js'

const attrName = 'data-remove-closest'

function init(element: HTMLElement) {
  if (element.dataset['removeClosestInitialized'] === 'true') return

  element.dataset['removeClosestInitialized'] = 'true'
  element.addEventListener('click', event => {
    event.preventDefault()

    const selector = element.getAttribute(attrName)
    if (!selector) return

    element.closest(selector)?.remove()
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
