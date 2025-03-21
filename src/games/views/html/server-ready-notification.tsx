export function ServerReadyNotification() {
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div play-sound-src="/public/fight.webm"></div>
    </div>
  )
}
