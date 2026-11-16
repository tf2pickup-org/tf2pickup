import htmx from './htmx.js'

interface SocketWrapper {
  send: (message: string) => void
}

let socket: SocketWrapper | undefined
let awaitingNavigationAck = false

const navigationAck = '<!--navigated-->'

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

  awaitingNavigationAck = true
  const msg = JSON.stringify({ navigated: path })
  socket.send(msg)
}

function hasEveryTarget(message: string) {
  const template = document.createElement('template')
  template.innerHTML = message
  return [...template.content.children].every(element => {
    const oob = element.getAttribute('hx-swap-oob') ?? 'true'
    const colon = oob.indexOf(':')
    try {
      const selector = colon > 0 ? oob.slice(colon + 1) : `#${CSS.escape(element.id)}`
      return document.querySelector(selector) !== null
    } catch {
      // ponytail: htmx's extended selectors (closest, find…) aren't checked; htmx resolves them
      return true
    }
  })
}

// Until the server acknowledges a navigation, it can still send swaps meant for the previous page.
htmx.on('htmx:wsBeforeMessage', event => {
  const { message } = (event as CustomEvent<{ message: string }>).detail
  if (message === navigationAck) {
    awaitingNavigationAck = false
    event.preventDefault()
  } else if (awaitingNavigationAck && !hasEveryTarget(message)) {
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
