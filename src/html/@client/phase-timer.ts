import { onLoadWithAttr } from './on-load-with-attr'

onLoadWithAttr('data-phase-timer', element => {
  const progress = element.querySelector<HTMLElement>('[data-phase-progress]')
  if (!progress) return
  const startedAt = Number(element.dataset['phaseStart'])
  const deadline = Number(element.dataset['phaseDeadline'])
  const remaining = Math.max(0, deadline - Date.now())
  const duration = Math.max(1, deadline - startedAt)
  progress.style.width = `${Math.min(100, (remaining / duration) * 100)}%`
  progress.getBoundingClientRect()
  requestAnimationFrame(() => {
    if (!progress.isConnected) return
    progress.style.transition = `width ${remaining}ms linear`
    progress.style.width = '0%'
  })
})
