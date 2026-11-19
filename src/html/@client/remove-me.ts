import htmx from './htmx'

const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

function scheduleRemoval(element: Element) {
  if (timers.has(element)) return
  const timing = element.getAttribute('remove-me') || element.getAttribute('data-remove-me')
  if (!timing) return

  timers.set(
    element,
    setTimeout(() => {
      timers.delete(element)
      element.remove()
    }, htmx.parseInterval(timing)),
  )
}

htmx.defineExtension('remove-me', {
  onEvent: (name: string, event: Event | CustomEvent) => {
    if (name !== 'htmx:afterProcessNode' && name !== 'htmx:beforeCleanupElement') return true
    const element = (event as CustomEvent<{ elt: Element }>).detail.elt
    if (name === 'htmx:afterProcessNode') {
      scheduleRemoval(element)
      element.querySelectorAll('[remove-me], [data-remove-me]').forEach(scheduleRemoval)
    } else if (name === 'htmx:beforeCleanupElement') {
      clearTimeout(timers.get(element))
      timers.delete(element)
    }
    return true
  },
})
