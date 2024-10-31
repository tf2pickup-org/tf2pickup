declare const THUMBNAIL_SERVICE_URL: string

interface Window {
  htmx: typeof import('htmx.org')
  requestNotificationPermissions: () => void
}
