import type { AppWebSocket } from './types'

// Marks a message for the page the socket is on now; the client drops it once it has left that page.
export function pageTag(socket: AppWebSocket) {
  return `<!--page:${socket.page}-->`
}
