import htmx from './htmx.js'

function init(details: HTMLDetailsElement) {
  const key = `details-persist-${details.getAttribute('data-details-persist')}`

  details.addEventListener('toggle', () => {
    try {
      localStorage.setItem(key, details.open ? 'open' : 'closed')
    } catch {
      // ignore (e.g. private browsing, quota exceeded)
    }
  })

  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) {
      details.open = saved === 'open'
    }
  } catch {
    // ignore
  }
}

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element instanceof HTMLDetailsElement && element.hasAttribute('data-details-persist')) {
    init(element)
  }

  element.querySelectorAll<HTMLDetailsElement>('[data-details-persist]').forEach(el => init(el))
})
