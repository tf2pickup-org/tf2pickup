import htmx from './htmx.js'

const attrName = 'data-refresh-page'

function reload(element: HTMLElement) {
  element.remove()
  location.reload()
}

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute(attrName)) {
    reload(element)
  }

  element.querySelectorAll(`[${attrName}]`).forEach(element => {
    if (element instanceof HTMLElement) {
      reload(element)
    }
  })
})
