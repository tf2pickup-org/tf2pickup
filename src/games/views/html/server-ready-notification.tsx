export function ServerReadyNotification() {
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div
        data-notification-title="Server ready!"
        data-notification-body="You can connect to the gameserver now"
        data-notification-icon="/favicon.png"
        data-notification-sound="/public/fight.webm"
      ></div>
    </div>
  )
}
