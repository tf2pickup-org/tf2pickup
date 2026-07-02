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
let showTimer: number | undefined

// Delay showing the banner so that joining a queue — which is itself the user
// gesture that resumes the audio context — doesn't flash it for a split second
// before the context reports it is running.
const showDelay = 500

function hasBeenActivated() {
  // navigator.userActivation is unavailable in some browsers (e.g. Safari)
  const activation = navigator.userActivation as UserActivation | undefined
  return activation?.hasBeenActive ?? false
}

function isAudioBlocked() {
  // A suspended context is only truly blocked when the user has never interacted.
  // Howler's idle autoSuspend also suspends it for players who already have, and
  // resume() succeeds for them, so those must not count as blocked.
  return Howler.ctx.state === 'suspended' && !hasBeenActivated()
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

function notificationBannerVisible() {
  // the notification-permission banners cover the same "you'll miss the game" concern,
  // and their call to action already unlocks audio, so don't stack a second banner
  return ['notifications-permission-default', 'notifications-permission-denied'].some(
    id => document.getElementById(id)?.style.display === 'block',
  )
}

function shouldShow() {
  return isAudioBlocked() && isInQueue() && !notificationBannerVisible()
}

function update() {
  if (banner) {
    if (shouldShow()) {
      if (showTimer === undefined && banner.style.display === 'none') {
        showTimer = window.setTimeout(() => {
          showTimer = undefined
          if (banner && shouldShow()) banner.style.display = ''
        }, showDelay)
      }
    } else {
      if (showTimer !== undefined) {
        clearTimeout(showTimer)
        showTimer = undefined
      }
      banner.style.display = 'none'
    }
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
