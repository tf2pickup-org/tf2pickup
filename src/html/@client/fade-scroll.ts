import htmx from './htmx.js'

const attrName = 'data-fade-scroll'

function update(element: HTMLElement) {
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

function init(element: HTMLElement) {
  element.addEventListener('scroll', event => {
    if (event.target && event.target instanceof HTMLElement) {
      update(event.target)
    }
  })
  update(element)
}

htmx.onLoad(element => {
  if (!(element instanceof HTMLElement)) return

  if (element.hasAttribute(attrName)) {
    init(element)
  }

  element.querySelectorAll(`[${attrName}]`).forEach(element => {
    if (element instanceof HTMLElement) {
      init(element)
    }
  })
})
