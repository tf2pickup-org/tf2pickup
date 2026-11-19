import { markPickPending } from './mark-pick-pending'

// hx-confirm only guards htmx's own requests, not websocket sends. This asks first, before htmx
// sees the click, and keeps the button from being pressed twice.
document.addEventListener(
  'click',
  event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-ws-confirm]')
    if (!button) return
    if ('pending' in button.dataset || !confirm(button.dataset['wsConfirm'])) {
      event.stopImmediatePropagation()
      event.preventDefault()
      return
    }
    markPickPending(button)
  },
  true,
)
