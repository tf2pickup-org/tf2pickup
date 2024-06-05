export function OfflineAlert() {
  return (
    <div
      role="alert"
      _="
      on htmx:wsClose from <body/> show me
      on htmx:wsOpen from <body/> hide me
    "
    >
      <div class="banner banner--warning">You are disconnected from the server.</div>
    </div>
  )
}
