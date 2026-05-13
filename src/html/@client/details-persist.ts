import { onLoadWithAttr } from './on-load-with-attr.js'

function init(element: HTMLElement) {
  const details = element as HTMLDetailsElement
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

onLoadWithAttr('data-details-persist', init)
