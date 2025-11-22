import htmx from './htmx.js'

const attrName = 'sync-attribute'

function sync(element: Element) {
  const syncDisabled = element.getAttribute(attrName)
  if (!syncDisabled) {
    console.error('sync-disabled empty', element)
    return
  }

  const matches = /^(\w+):([a-zA-Z0-9#]+)\.(\w+)\s===\s?(.+)$/.exec(syncDisabled)
  if (!matches) {
    console.error('sync-disabled has invalid syntax', element)
    return
  }

  const targetAttr = matches[1]!
  const selector = matches[2]!
  const sourceAttr = matches[3]!
  const cond = matches[4]!

  const source = htmx.find(selector)
  if (!source) {
    return
  }

  const result = source.getAttribute(sourceAttr) === cond
  if (result) {
    element.setAttribute(targetAttr, `${result}`)
  } else {
    element.removeAttribute(targetAttr)
  }
}

htmx.defineExtension('sync-attribute', {
  onEvent: (name: string) => {
    if (name !== 'htmx:afterProcessNode') {
      return true
    }

    htmx.findAll(`[${attrName}]`).forEach(sync)
    return true
  },
})
