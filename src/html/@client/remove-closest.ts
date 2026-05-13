import { onLoadWithAttr } from './on-load-with-attr.js'

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

onLoadWithAttr(attrName, init)
