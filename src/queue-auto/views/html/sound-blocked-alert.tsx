export function SoundBlockedAlert() {
  return (
    <div style="display: none;" data-sound-blocked-alert>
      <div class="banner flex flex-col gap-y-2 md:flex-row" data-tone="alert" role="alert">
        <p class="flex-1 text-center md:text-start">
          Your browser is blocking the ready-up sound. Click to enable it so you don't miss a game.
        </p>
        <button
          class="button"
          data-size="dense"
          data-variant="alert"
          data-umami-event="enable-sound"
        >
          Enable sound
        </button>
      </div>
    </div>
  )
}
