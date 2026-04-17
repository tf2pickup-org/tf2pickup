import htmx from './htmx.js'

const attrName = 'data-countdown'

interface HtmxNodeInternalData {
  countdownInterval?: ReturnType<typeof setInterval>
}

let api: {
  getInternalData: (elt: Element) => HtmxNodeInternalData
}

function formatTimeout(ms: number) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return seconds === 60
    ? (minutes + 1).toString() + ':00'
    : minutes.toString() + ':' + (seconds < 10 ? '0' : '') + seconds.toString()
}

function maybeInit(element: Element) {
  if (!(element instanceof HTMLElement)) return
  if (!element.hasAttribute(attrName)) return

  const internalData = api.getInternalData(element)
  if (internalData.countdownInterval !== undefined) return

  const deadline = Number(element.getAttribute(attrName))
  internalData.countdownInterval = setInterval(() => {
    const ms = Math.max(deadline - Date.now(), 0)
    element.textContent = formatTimeout(ms)
    if (ms <= 0) {
      clearInterval(internalData.countdownInterval)
      delete internalData.countdownInterval
    }
  }, 1000)
}

htmx.defineExtension('countdown', {
  init: apiRef => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    api = apiRef
  },
  onEvent: (name: string, evt: Event | CustomEvent) => {
    switch (name) {
      case 'htmx:afterProcessNode': {
        const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
        maybeInit(element)
        element.querySelectorAll(`[${attrName}]`).forEach(maybeInit)
        break
      }
      case 'htmx:beforeCleanupElement': {
        const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
        const internalData = api.getInternalData(element)
        if (internalData.countdownInterval !== undefined) {
          clearInterval(internalData.countdownInterval)
          delete internalData.countdownInterval
        }
        break
      }
    }
    return true
  },
})
