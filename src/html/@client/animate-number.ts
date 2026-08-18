import htmx from './htmx.js'

const attrName = 'data-animate-number'
const durationMs = 200

const lastValues = new Map<string, number>()
const activeFrames = new Map<string, number>()

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function maybeAnimate(element: Element) {
  if (!(element instanceof HTMLElement)) return
  if (!element.hasAttribute(attrName)) return
  if (!element.id) return

  const target = Number(element.textContent.trim())
  if (Number.isNaN(target)) return

  const key = element.id
  const from = lastValues.get(key)
  lastValues.set(key, target)

  const activeFrame = activeFrames.get(key)
  if (activeFrame !== undefined) cancelAnimationFrame(activeFrame)

  if (from === undefined || from === target || prefersReducedMotion()) return

  element.textContent = from.toString()
  const startedAt = performance.now()
  const step = (now: number) => {
    const t = Math.min((now - startedAt) / durationMs, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    if (t < 1) {
      element.textContent = Math.round(from + (target - from) * eased).toString()
      activeFrames.set(key, requestAnimationFrame(step))
    } else {
      element.textContent = target.toString()
      activeFrames.delete(key)
    }
  }
  activeFrames.set(key, requestAnimationFrame(step))
}

htmx.defineExtension('animate-number', {
  onEvent: (name: string, evt: Event | CustomEvent) => {
    if (name === 'htmx:afterProcessNode') {
      const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
      maybeAnimate(element)
      element.querySelectorAll(`[${attrName}]`).forEach(maybeAnimate)
    }
    return true
  },
})
