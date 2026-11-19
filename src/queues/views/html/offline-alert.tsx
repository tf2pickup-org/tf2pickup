export function OfflineAlert() {
  return (
    <div style="display: none;" role="alert" data-offline-alert>
      <div class="banner" data-tone="warning">
        You are disconnected from the server.
      </div>
    </div>
  )
}
