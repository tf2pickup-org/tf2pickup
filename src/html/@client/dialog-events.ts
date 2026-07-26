import { onLoadWithAttr } from './on-load-with-attr.js'

const attrName = 'data-dialog-events'

function init(element: HTMLElement) {
  if (!(element instanceof HTMLDialogElement)) return
  if (element.dataset['dialogEventsInitialized'] === 'true') return

  element.dataset['dialogEventsInitialized'] = 'true'
  element.addEventListener('open', () => {
    element.showModal()
  })
  element.addEventListener('close', () => {
    element.close()
  })
}

onLoadWithAttr(attrName, init)
