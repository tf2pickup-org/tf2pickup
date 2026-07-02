import htmx from './htmx'
import { Howler } from 'howler'
import { onLoadWithAttr } from './on-load-with-attr'

const attrName = 'data-sound-blocked-alert'

interface SocketWrapper {
  send: (message: string) => void
}

let socket: SocketWrapper | undefined
let banner: HTMLElement | undefined
let lastReported: boolean | undefined
let ctxListenerAttached = false

function isAudioBlocked() {
  return Howler.ctx.state === 'suspended'
}

function isInQueue() {
  return document.querySelector<HTMLInputElement>('#isInQueue')?.value === 'true'
}

function reportAudioStatus() {
  if (!socket) return
  const audioReady = !isAudioBlocked()
  if (audioReady === lastReported) return
  lastReported = audioReady
  socket.send(JSON.stringify({ audioReady }))
}

function update() {
  if (banner) {
    banner.style.display = isAudioBlocked() && isInQueue() ? '' : 'none'
  }
  reportAudioStatus()
}

function ensureCtxListener() {
  if (ctxListenerAttached) return
  Howler.ctx.addEventListener('statechange', update)
  ctxListenerAttached = true
}

function init(element: HTMLElement) {
  banner = element
  element.querySelector('button')?.addEventListener('click', () => {
    void Howler.ctx.resume()
  })
  ensureCtxListener()
  update()
}

htmx.on('htmx:wsOpen', event => {
  socket = (event as CustomEvent<{ socketWrapper: SocketWrapper }>).detail.socketWrapper
  lastReported = undefined
  reportAudioStatus()
})

// queue membership is swapped into #isInQueue over the websocket
htmx.on('htmx:wsAfterMessage', update)

onLoadWithAttr(attrName, init)
