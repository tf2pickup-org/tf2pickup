import { markPickPending } from './mark-pick-pending'

// Captured before htmx sees the click, so a pending row sends nothing, not even from the keyboard.
document.addEventListener(
  'click',
  event => {
    const button = (event.target as Element).closest<HTMLElement>('[data-pick-button]')
    if (!button) return
    if ('pending' in button.dataset) {
      event.stopImmediatePropagation()
      event.preventDefault()
      return
    }
    markPickPending(button)
  },
  true,
)
