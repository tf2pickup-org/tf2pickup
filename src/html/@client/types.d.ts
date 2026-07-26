interface Window {
  htmx: typeof import('htmx.org').default
  umami?: {
    track: (eventName: string, eventData?: Record<string, unknown>) => void
    identify: (data: Record<string, unknown>) => void
  }
}
