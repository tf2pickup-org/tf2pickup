import { formatDistanceToNow, secondsToMilliseconds } from 'date-fns'
import htmx from './htmx.js'

const attrName = 'data-relative-time'

interface HtmxNodeInternalData {
  relativeTimeInterval?: ReturnType<typeof setInterval>
}

let api: {
  getInternalData: (elt: Element) => HtmxNodeInternalData
}

function maybeInit(element: Element) {
  const date = new Date(element.getAttribute(attrName) ?? '')
  if (Number.isNaN(date.getTime())) return

  const internalData = api.getInternalData(element)
  if (internalData.relativeTimeInterval !== undefined) return

  internalData.relativeTimeInterval = setInterval(() => {
    element.textContent = formatDistanceToNow(date, { addSuffix: true })
  }, secondsToMilliseconds(30))
}

htmx.defineExtension('relative-time', {
  init: apiRef => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    api = apiRef
  },
  onEvent: (name: string, evt: Event | CustomEvent) => {
    switch (name) {
      case 'htmx:afterProcessNode': {
        const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
        if (element.hasAttribute(attrName)) maybeInit(element)
        element.querySelectorAll(`[${attrName}]`).forEach(maybeInit)
        break
      }
      case 'htmx:beforeCleanupElement': {
        const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
        const internalData = api.getInternalData(element)
        if (internalData.relativeTimeInterval !== undefined) {
          clearInterval(internalData.relativeTimeInterval)
          delete internalData.relativeTimeInterval
        }
        break
      }
    }
    return true
  },
})
