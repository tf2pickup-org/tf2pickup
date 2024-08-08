function initFlashMessage(
  /** @type {HTMLProgressElement} */ progress,
  /** @type {HTMLElement} */ messageBox,
) {
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

window.initFlashMessage = initFlashMessage
