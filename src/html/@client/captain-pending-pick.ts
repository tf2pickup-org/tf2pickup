// The websocket gives no response to wait for, so a picked row is disabled and dimmed at once. The
// draft's next update replaces it; if the pick was refused, the row comes back after a moment.
const pendingMs = 3000

document.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-pick-button]')
  if (!button || button.disabled) return
  button.classList.add('opacity-60')
  // after htmx has read the button, so the click still sends
  setTimeout(() => {
    button.disabled = true
  })
  setTimeout(() => {
    if (!button.isConnected) return
    button.disabled = false
    button.classList.remove('opacity-60')
  }, pendingMs)
})
