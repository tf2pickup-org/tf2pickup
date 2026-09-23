import htmx from './htmx'

let cleanupTimer: number | undefined

htmx.on('htmx:beforeTransition', event => {
  const source = event.target
  const isGamemodeNavigation =
    source instanceof Element && source.closest('.gamemode-option') !== null

  document.documentElement.classList.toggle('queue-gamemode-transition', isGamemodeNavigation)

  if (!isGamemodeNavigation) {
    return
  }

  window.clearTimeout(cleanupTimer)
  cleanupTimer = window.setTimeout(() => {
    document.documentElement.classList.remove('queue-gamemode-transition')
  }, 250)
})
