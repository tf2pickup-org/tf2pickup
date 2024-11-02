import htmx from 'htmx.org'

function update(/** @type {HTMLElement} */ element) {
  const isScrollable = element.scrollHeight > element.clientHeight
  if (!isScrollable) {
    element.classList.remove('mask-top', 'mask-bottom')
    return
  }

  if (element.scrollHeight > element.clientHeight + element.scrollTop) {
    element.classList.add('mask-bottom')
  } else {
    element.classList.remove('mask-bottom')
  }

  if (element.scrollTop > 0) {
    element.classList.add('mask-top')
  } else {
    element.classList.remove('mask-top')
  }
}

function initElement(/** @type {HTMLElement} */ element) {
  // @ts-ignore
  element.addEventListener('scroll', event => update(event.target))
  update(element)
}

window.addEventListener('load', () => {
  htmx.onLoad(element => {
    if (!(element instanceof HTMLElement)) return

    if (element.hasAttribute('data-fade-scroll')) {
      initElement(element)
    }

    element.querySelectorAll('[data-fade-scroll]').forEach(element => {
      if (element instanceof HTMLElement) {
        initElement(element)
      }
    })
  })

  document.querySelectorAll('[data-fade-scroll]').forEach(element => {
    if (element instanceof HTMLElement) {
      initElement(element)
    }
  })
})
