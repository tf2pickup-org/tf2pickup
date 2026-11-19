import { secondsToMilliseconds } from 'date-fns'

const pendingMs = secondsToMilliseconds(3)

// A pick has no response to wait for, so its row is dimmed and ignores clicks until the draft's
// next update replaces it, or for a moment if the pick was refused. It is not `disabled`: that
// belongs to data-disable-when-offline, which must stay in charge when the socket closes.
export function markPickPending(button: HTMLElement) {
  button.dataset['pending'] = ''
  button.setAttribute('aria-disabled', 'true')
  button.classList.add('opacity-60', 'pointer-events-none')
  setTimeout(() => {
    if (!button.isConnected) return
    delete button.dataset['pending']
    button.removeAttribute('aria-disabled')
    button.classList.remove('opacity-60', 'pointer-events-none')
  }, pendingMs)
}
