import htmx from './htmx.js'

const attrName = 'data-countdown'
const runningAttr = 'data-countdown-running'

function formatTimeout(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return seconds === 60
    ? (minutes + 1).toString() + ':00'
    : minutes.toString() + ':' + (seconds < 10 ? '0' : '') + seconds.toString()
}

function init(element: HTMLElement) {
  if (element.hasAttribute(runningAttr)) return
  element.setAttribute(runningAttr, '')

  const deadline = Number(element.getAttribute(attrName))
  const interval = setInterval(() => {
    const ms = Math.max(deadline - Date.now(), 0)
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
