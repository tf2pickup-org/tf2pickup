import { onLoadWithAttr } from './on-load-with-attr.js'

const attrName = 'data-queue-order'

// Reorders the rows by dragging their handle or with the move buttons, then submits the order form.
function init(list: HTMLElement) {
  const form = document.getElementById(list.getAttribute(attrName) ?? '')
  if (!(form instanceof HTMLFormElement)) return

  const order = () => [...list.children].map(row => row.getAttribute('aria-label')).join()
  const save = () => {
    form.requestSubmit()
  }
  let dragged: HTMLElement | null = null
  let before = ''

  list.addEventListener('pointerdown', event => {
    const row = (event.target as Element).closest('[data-drag-handle]')?.closest('tr')
    if (row) row.draggable = true
  })
  list.addEventListener('dragstart', event => {
    dragged = event.target as HTMLElement
    before = order()
    event.dataTransfer?.setData('text/plain', '')
    dragged.toggleAttribute('data-dragging', true)
  })
  list.addEventListener('dragover', event => {
    const row = (event.target as Element).closest('tr')
    if (!dragged || row?.parentElement !== list) return
    event.preventDefault()
    if (row === dragged) return
    const { top, height } = row.getBoundingClientRect()
    list.insertBefore(dragged, event.clientY < top + height / 2 ? row : row.nextSibling)
  })
  list.addEventListener('drop', event => {
    event.preventDefault()
  })
  list.addEventListener('dragend', () => {
    if (!dragged) return
    dragged.draggable = false
    dragged.removeAttribute('data-dragging')
    dragged = null
    if (order() !== before) save()
  })
  list.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-move]')
    const row = button?.closest('tr')
    if (!button || !row) return
    if (button.dataset['move'] === 'up') row.previousElementSibling?.before(row)
    else row.nextElementSibling?.after(row)
    // moving the row blurs the button; keep keyboard users where they were
    button.focus()
    save()
  })
}

onLoadWithAttr(attrName, init)
