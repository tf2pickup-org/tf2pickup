import htmx from './htmx.js'

function sync(element: Element) {
  const attributes = element.attributes
  for (const attr of attributes) {
    if (!attr.name.startsWith('sync-attr:')) {
      continue
    }

    const [, targetAttr] = attr.name.split(':')
    if (!targetAttr) {
      continue
    }

    const matches = /^([a-zA-Z0-9#]+)\.([a-zA-Z0-9-]+)\s?===\s?(.+)$/.exec(attr.value)
    if (!matches) {
      console.error('sync-attribute has invalid syntax', element)
      continue
    }

    const selector = matches[1]!
    const sourceAttr = matches[2]!
    const cond = matches[3]!

    const source = htmx.find(selector)
    if (!source) {
      continue
    }

    const result = source.getAttribute(sourceAttr) === cond
    if (result) {
      element.setAttribute(targetAttr, `${result}`)
    } else {
      element.removeAttribute(targetAttr)
    }
  }
}

const expression = new XPathEvaluator().createExpression(
  './/*[@*[ starts-with(name(), "sync-attr:")]]',
)

htmx.defineExtension('sync-attribute', {
  onEvent: (name: string) => {
    if (name !== 'htmx:load') {
      return true
    }

    const result = expression.evaluate(document)
    const elements: Element[] = []

    let node: Node | null
    while ((node = result.iterateNext())) {
      if (node instanceof Element) {
        elements.push(node)
      }
    }

    elements.forEach(sync)
    return true
  },
})
