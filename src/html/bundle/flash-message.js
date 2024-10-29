import htmx from 'htmx.org'

function initFlashMessage(/** @type {HTMLElement} */ messageBox) {
  const progress = messageBox.querySelector('progress')
  if (!progress) {
    return
  }

  const timeout = 3.5 * 1000 // 3.5 seconds
  const steps = timeout / 10

  const interval = setInterval(() => {
    let value = progress.value
    value -= 100 / steps
    progress.value = value
    if (value <= 0) {
      clearInterval(interval)
      messageBox.remove()
    }
  }, timeout / steps)
}

window.addEventListener('load', () => {
  // https://htmx.org/events/#htmx:load
  htmx.onLoad(element => {
    if (!(element instanceof HTMLElement)) return

    if (element.hasAttribute('data-flash-message')) {
      initFlashMessage(element)
    }

    element.querySelectorAll('[data-flash-message]').forEach(element => {
      if (element instanceof HTMLElement) {
        initFlashMessage(element)
      }
    })
  })

  document.querySelectorAll('[data-flash-message]').forEach(element => {
    if (element instanceof HTMLElement) {
      initFlashMessage(element)
    }
  })
})
