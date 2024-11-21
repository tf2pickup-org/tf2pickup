declare const THUMBNAIL_SERVICE_URL: string

interface Window {
  env: {
    THUMBNAIL_SERVICE_URL: string
  }
  htmx: typeof import('htmx.org')
  requestNotificationPermissions: () => void
}
