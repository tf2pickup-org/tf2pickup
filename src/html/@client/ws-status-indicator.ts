import htmx from './htmx.js'

type WsStatus = 'connecting' | 'connected' | 'disconnected'

const tooltipText: Record<WsStatus, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnected: 'Disconnected',
}

function setStatus(status: WsStatus) {
  const indicator = document.querySelector<HTMLElement>('#ws-status')
  if (!indicator) return
  indicator.dataset['wsStatus'] = status
  indicator.setAttribute('aria-label', tooltipText[status])
  const tooltip = indicator.querySelector(':scope > .tooltip')
  if (tooltip) tooltip.textContent = tooltipText[status]
}

htmx.on('htmx:wsConnecting', () => {
  setStatus('connecting')
})
htmx.on('htmx:wsOpen', () => {
  setStatus('connected')
})
htmx.on('htmx:wsClose', () => {
  setStatus('disconnected')
})
