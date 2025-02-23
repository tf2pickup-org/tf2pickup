import htmx from './htmx.js'

interface SocketWrapper {
  send: (message: string) => void
}

let socket: SocketWrapper

function reportNavigation(path: string) {
  const msg = JSON.stringify({ navigated: path })
  socket.send(msg)
}

export async function goTo(path: string) {
  await htmx.ajax('get', path, document.body)
  history.pushState({}, '', path)
  reportNavigation(path)
}

htmx.on('htmx:wsOpen', event => {
  socket = (event as CustomEvent<{ socketWrapper: SocketWrapper }>).detail.socketWrapper
  reportNavigation(window.location.pathname)
})

htmx.on('htmx:pushedIntoHistory', event => {
  const detail = (event as CustomEvent<{ path: string }>).detail
  reportNavigation(detail.path)
})
