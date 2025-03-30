import htmx from './htmx.js'

function maybeCopyToClipboard(element: Element) {
  const text =
    element.getAttribute('data-copy-to-clipboard') ?? element.getAttribute('copy-to-clipboard')
  if (!text) {
    return
  }

  element.addEventListener('click', async event => {
    event.preventDefault()
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error(error)
    }
  })
}

htmx.defineExtension('copy-to-clipboard', {
  onEvent: (name: string, evt: Event | CustomEvent) => {
    if (name !== 'htmx:afterProcessNode') {
      return true
    }

    const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
    maybeCopyToClipboard(element)
    const children = element.querySelectorAll('[data-copy-to-clipboard], [copy-to-clipboard]')
    for (const child of children) {
      maybeCopyToClipboard(child)
    }
    return true
  },
})
