import htmx from './htmx.js'

const root = document.createElement('div')
const attrName = 'data-disable-when-offline'
let online = navigator.onLine

htmx.on('htmx:wsOpen', () => {
  online = true
  root.dispatchEvent(new Event('onlinestatechange'))
})
htmx.on('htmx:wsClose', () => {
  online = false
  root.dispatchEvent(new Event('onlinestatechange'))
})

function init(element: HTMLElement) {
  function update() {
    element.querySelectorAll('button').forEach(button => {
      button.disabled = !online || button.dataset['initiallyDisabled'] === 'true'
    })
  }

  element.querySelectorAll('button').forEach(button => {
    button.dataset['initiallyDisabled'] = button.disabled.toString()
  })

  root.addEventListener('onlinestatechange', update)
  update()
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
