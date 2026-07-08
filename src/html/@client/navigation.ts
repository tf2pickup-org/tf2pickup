import htmx from './htmx.js'

interface SocketWrapper {
  send: (message: string) => void
}

let socket: SocketWrapper | undefined

function normalizePath(path: string) {
  try {
    const url = new URL(path, window.location.href)
    return url.pathname + url.search
  } catch {
    return path.split('#')[0]!
  }
}

function reportNavigation(path: string) {
  if (!socket) {
    return
  }

  const msg = JSON.stringify({ navigated: path })
  socket.send(msg)
}

export async function goTo(path: string) {
  await htmx.ajax('get', path, { target: document.body, push: 'true' })
}

htmx.on('htmx:wsOpen', event => {
  socket = (event as CustomEvent<{ socketWrapper: SocketWrapper }>).detail.socketWrapper
  reportNavigation(window.location.pathname + window.location.search)
})

htmx.on('htmx:pushedIntoHistory', event => {
  reportNavigation(normalizePath((event as CustomEvent<{ path: string }>).detail.path))
})

htmx.on('htmx:replacedInHistory', event => {
  reportNavigation(normalizePath((event as CustomEvent<{ path: string }>).detail.path))
})

htmx.on('htmx:historyRestore', event => {
  reportNavigation(normalizePath((event as CustomEvent<{ path: string }>).detail.path))
})
