import htmx from './htmx.js'

function locateTabContentHolder(tab: Element): HTMLElement | null {
  if (!(tab instanceof HTMLElement)) {
    return null
  }

  const id = tab.getAttribute('data-tabs-select')
  if (!id) {
    return null
  }

  const holder = document.querySelector(`#${id}`)
  if (holder instanceof HTMLElement) {
    return holder
  }
  return null
}

function init(container: HTMLElement) {
  const tabs = container.querySelectorAll('[data-tabs-select]')
  if (tabs.length === 0) {
    return
  }

  const shouldPersist = container.hasAttribute('data-tabs-persist')
  const storageKey = shouldPersist
    ? `tabs-${(container.getAttribute('data-tabs-persist') ?? tabs.item(0).getAttribute('data-tabs-select')) ?? 'default'}`
    : null

  function selectTab(tab: Element) {
    tabs.forEach(tab => {
      const holder = locateTabContentHolder(tab)
      if (holder) {
        holder.style.display = 'none'
      }
    })

    tabs.forEach(tab => {
      tab.classList.remove('active')
    })

    const holder = locateTabContentHolder(tab)
    if (holder) {
      holder.style.display = ''
      tab.classList.add('active')
    }

    // Save selection to sessionStorage if persistence is enabled
    if (shouldPersist && storageKey) {
      const tabId = tab.getAttribute('data-tabs-select')
      if (tabId) {
        try {
          sessionStorage.setItem(storageKey, tabId)
        } catch {
          // Ignore storage errors (e.g., quota exceeded, private browsing)
        }
      }
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      selectTab(tab)
    })
  })

  // Try to restore saved selection, fallback to first tab
  let initialTab: Element | null = null
  if (shouldPersist && storageKey) {
    try {
      const savedTabId = sessionStorage.getItem(storageKey)
      if (savedTabId) {
        const savedTab = Array.from(tabs).find(
          tab => tab.getAttribute('data-tabs-select') === savedTabId
        )
        if (savedTab) {
          initialTab = savedTab
        }
      }
    } catch {
      // Ignore storage errors (e.g., private browsing)
    }
  }

  selectTab(initialTab ?? tabs.item(0))
}

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute('data-tabs')) {
    init(element)
  }

  element.querySelectorAll('[data-tabs]').forEach(element => {
    if (element instanceof HTMLElement) {
      init(element)
    }
  })
})
