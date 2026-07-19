import { onLoadWithAttr } from './on-load-with-attr.js'

const attrName = 'data-reset-on-success'

function init(element: HTMLElement) {
  if (!(element instanceof HTMLFormElement)) return
  if (element.dataset['resetOnSuccessInitialized'] === 'true') return

  element.dataset['resetOnSuccessInitialized'] = 'true'
  element.addEventListener('htmx:afterRequest', event => {
    if (event.target !== element) return
    if (!(event as CustomEvent<{ successful?: boolean }>).detail.successful) return

    element.reset()

    const focusSelector = element.getAttribute(attrName)
    if (focusSelector) {
      element.querySelector<HTMLElement>(focusSelector)?.focus()
    }
  })
}

onLoadWithAttr(attrName, init)
