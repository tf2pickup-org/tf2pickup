import htmx from './htmx.js'

interface SocketWrapper {
  send: (message: string) => void
}

let socket: SocketWrapper | undefined
let page = 0

function normalizePath(path: string) {
  try {
    return new URL(path, window.location.href).pathname
  } catch {
    return path.split('?')[0]!.split('#')[0]!
  }
}

function reportNavigation(path: string) {
  if (!socket) {
    return
  }

  const msg = JSON.stringify({ navigated: path, page: ++page })
  socket.send(msg)
}

// page-scoped messages are tagged with the page they were addressed to; drop the ones for a page we left
htmx.on('htmx:wsBeforeMessage', event => {
  const { message } = (event as CustomEvent<{ message: string }>).detail
  const tag = /^<!--page:(\d+)-->/.exec(message)
  if (tag && Number(tag[1]) !== page) {
    event.preventDefault()
  }
})

export async function goTo(path: string) {
  await htmx.ajax('get', path, { target: document.body, push: 'true' })
}

htmx.on('htmx:wsOpen', event => {
  socket = (event as CustomEvent<{ socketWrapper: SocketWrapper }>).detail.socketWrapper
  reportNavigation(window.location.pathname)
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
