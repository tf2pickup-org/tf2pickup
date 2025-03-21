import htmx from './htmx.js'

interface HtmxNodeInternalData {
  notification?: Notification
}

let api: {
  getInternalData: (elt: Element) => HtmxNodeInternalData
}

function maybeShowNotification(element: Element) {
  const title =
    element.getAttribute('data-notification-title') ?? element.getAttribute('notification-title')
  if (!title) {
    return
  }

  const body =
    element.getAttribute('data-notification-body') ?? element.getAttribute('notification-body')
  const icon =
    element.getAttribute('data-notification-icon') ?? element.getAttribute('notification-icon')
  const notification = new Notification(title, {
    ...(body ? { body } : {}),
    ...(icon ? { icon } : {}),
  })
  api.getInternalData(element).notification = notification
}

htmx.defineExtension('notifications', {
  init: apiRef => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    api = apiRef
  },
  onEvent: (name: string, evt: Event | CustomEvent) => {
    switch (name) {
      case 'htmx:beforeCleanupElement': {
        const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
        if (element instanceof HTMLElement) {
          const internalData = api.getInternalData(element)
          if (internalData.notification) {
            internalData.notification.close()
            delete internalData.notification
          }
        }
        break
      }

      case 'htmx:afterProcessNode': {
        const element = (evt as CustomEvent<{ elt: Element }>).detail.elt
        maybeShowNotification(element)
        const children = element.querySelectorAll('[data-notification-title], [notification-title]')
        for (const child of children) {
          maybeShowNotification(child)
        }
        break
      }
    }

    return true
  },
})
