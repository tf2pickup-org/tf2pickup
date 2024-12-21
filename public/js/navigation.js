import htmx from './htmx.js'

/**
 * @typedef WsSend
 * @type {function}
 * @param {string} message
 */

/**
 * @typedef SocketWrapper
 * @type {object}
 * @property {WsSend} send
 */

/** @type {SocketWrapper} */
let socket

export function reportNavigation(/** @type {string} */ path) {
  const msg = JSON.stringify({ navigated: path })
  socket?.send(msg)
}

/**
 * @param {{detail: {socketWrapper: SocketWrapper}}} event
 */
htmx.on('htmx:wsOpen', event => {
  socket = event.detail.socketWrapper
  reportNavigation(window.location.pathname)
})

htmx.on('htmx:pushedIntoHistory', ({ detail }) => {
  reportNavigation(detail.path)
})
