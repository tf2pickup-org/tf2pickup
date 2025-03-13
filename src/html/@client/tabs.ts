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
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      selectTab(tab)
    })
  })

  selectTab(tabs.item(0))
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
