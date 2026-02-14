import htmx from './htmx.js'

export async function goTo(path: string) {
  await htmx.ajax('get', path, document.body)
  history.pushState({}, '', path)
}

htmx.on('htmx:wsAfterMessage', event => {
  const message = (event as CustomEvent<{ message: string }>).detail.message
  try {
    const parsed = JSON.parse(message) as unknown
    if (parsed && typeof parsed === 'object' && 'socketId' in parsed) {
      const socketId = (parsed as { socketId: string }).socketId
      // Set up hx-headers on body to include socket ID in all HTMX requests
      document.body.setAttribute('hx-headers', JSON.stringify({ 'x-ws-id': socketId }))
      // htmx.process(document.body)
    }
  } catch {
    // Not JSON, ignore (probably HTML content)
  }
})
