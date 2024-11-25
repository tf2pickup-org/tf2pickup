import htmx from './htmx.js'

const attrName = 'data-countdown'

function init(/** @type {HTMLElement} */ element) {
  let ms = Number(element.getAttribute(attrName))
  let last = Date.now()
  const interval = setInterval(() => {
    ms = Math.max(ms - (Date.now() - last), 0)
    last = Date.now()
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    element.textContent = `${minutes}:${seconds.length === 1 ? '0' : ''}${seconds}`
    if (ms <= 0) {
      clearInterval(interval)
    }
  }, 1000)

  function maybeRemove() {
    if (document.body.contains(element)) return
    clearInterval(interval)
    htmx.off('htmx:afterSwap', maybeRemove)
  }

  htmx.on('htmx:afterSwap', maybeRemove)
}

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute(attrName)) {
    init(element)
  }

  element.querySelectorAll(`[${attrName}]`).forEach(element => {
    if (element instanceof HTMLElement) {
      init(element)
    }
  })
})
