import htmx from './htmx.js'

export function onLoadWithAttr(attrName: string, init: (element: HTMLElement) => void) {
  htmx.onLoad(element => {
    if (!(element instanceof HTMLElement)) return

    if (element.hasAttribute(attrName)) {
      init(element)
    }

    element.querySelectorAll<HTMLElement>(`[${attrName}]`).forEach(init)
  })
}
