export function RequestNotificationPermissions() {
  return (
    <>
      <div
        class="hidden"
        id="notifications-permission-default"
        _="init js requestNotificationPermissions()"
      >
        <div class="banner banner--alert flex flex-row">
          <p class="flex-1">
            To be notified when a game is about to start, we need your permission to show browser
            notifications.
          </p>
          <button class="button button--dense button--alert" id="request-notifications-permission">
            Allow notifications
          </button>
        </div>
      </div>
      <div class="hidden" id="notifications-permission-denied">
        <div class="banner banner--warning hidden">
          <p class="flex-1">
            You have disabled browser notifications. You will not be warned when a game is about to
            start.
          </p>
        </div>
      </div>
    </>
  )
}
