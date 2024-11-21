import htmx from 'htmx.org'

function init(element: HTMLElement) {
  let ms = Number(element.getAttribute('data-countdown'))
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

  if (element.hasAttribute('data-countdown')) {
    init(element)
  }

  element.querySelectorAll('[data-countdown]').forEach(element => {
    if (element instanceof HTMLElement) {
      init(element)
    }
  })
})
