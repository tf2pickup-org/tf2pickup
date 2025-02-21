import htmx from './htmx.js'

const attrName = 'data-countdown'

function formatTimeout(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return seconds === 60
    ? (minutes + 1).toString() + ':00'
    : minutes.toString() + ':' + (seconds < 10 ? '0' : '') + seconds.toString()
}

function init(element: HTMLElement) {
  let ms = Number(element.getAttribute(attrName))
  let last = Date.now()
  const interval = setInterval(() => {
    ms = Math.max(ms - (Date.now() - last), 0)
    last = Date.now()
    element.textContent = formatTimeout(ms)
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
