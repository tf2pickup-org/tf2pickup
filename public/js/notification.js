import htmx from './htmx.js'
import { Howl } from 'https://cdn.jsdelivr.net/npm/howler@2.2.4/+esm'

function init(/** @type {HTMLElement} */ element) {
  const title = element.getAttribute('data-notification-title')
  if (!title) {
    return
  }

  const body = element.getAttribute('data-notification-body') ?? ''
  const icon = element.getAttribute('data-notification-icon')
  const notification = new Notification(title, { body, ...(icon ? { icon } : {}) })

  let /** @type {Howl} */ howl
  const sound = element.getAttribute('data-notification-sound')
  if (sound) {
    let volume = 1.0

    const v = element.getAttribute('data-notification-sound-volume')
    if (v) {
      volume = parseFloat(v)
    }

    howl = new Howl({
      src: sound,
      autoplay: true,
      volume,
    })
  }

  function afterSwap() {
    if (document.body.contains(element)) {
      return
    }

    notification.close()
    howl.stop()
    htmx.off('htmx:afterSwap', afterSwap)
  }

  htmx.on('htmx:afterSwap', afterSwap)
}

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute('data-notification-title')) {
    init(element)
  }

  element.querySelectorAll(`[data-notification-title]`).forEach(element => {
    if (element instanceof HTMLElement) {
      init(element)
    }
  })
})
