import htmx from './htmx.js'

const timeout = 3.5 * 1000 // 3.5 seconds
const steps = timeout / 10
const attrName = 'data-flash-message'

function initFlashMessage(messageBox: HTMLElement) {
  const progress = messageBox.querySelector('progress')
  if (!progress) {
    return
  }

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

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute(attrName)) {
    initFlashMessage(element)
  }

  element.querySelectorAll(`[${attrName}]`).forEach(element => {
    if (element instanceof HTMLElement) {
      initFlashMessage(element)
    }
  })
})
