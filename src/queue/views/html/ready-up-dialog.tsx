import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { players } from '../../../players'

const dialogId = 'ready-up-dialog'

export function ReadyUpDialog() {
  return (
    <>
      <dialog
        class="bg-abru-dark-29 w-[616px] rounded-xl px-[59px] py-[42px] shadow-xl"
        id={dialogId}
        play-sound-src="/sounds/ready_up.webm"
        play-sound-volume="1.0"
        hx-on-show={`this.showModal(); this.querySelector('button').removeAttribute('disabled')`}
        hx-on-close-dialog="this.close()"
      >
        <form
          class="flex flex-col items-center gap-11"
          hx-on-submit={`document.querySelector('#${dialogId} button').setAttribute('disabled', '')`}
        >
          <div class="text-abru-light-75 flex flex-col items-center text-[32px] font-bold">
            <span>Game is starting!</span>
            <span>Are you ready to play?</span>
          </div>

          <div class="flex flex-col gap-4">
            <button
              name="ready"
              value=""
              class="bg-accent-600 w-[242px] rounded-sm py-[12px] text-xl font-bold text-gray-50 uppercase"
              autofocus
              ws-send
              data-umami-event="ready-up"
            >
              I'm ready
            </button>
            <button
              name="leave"
              value=""
              class="bg-abru-light-5 w-[242px] rounded-sm py-[12px] text-xl font-bold text-gray-50"
              ws-send
              data-umami-event="not-ready"
            >
              No, I can't play now
            </button>
          </div>
        </form>
      </dialog>
      <div id="ready-up-notification-container" class="hidden"></div>
    </>
  )
}

ReadyUpDialog.show = async (actor: SteamId64) => {
  const player = await players.bySteamId(actor, ['preferences.soundVolume'])
  return (
    <>
      <div id="notify-container" hx-swap-oob="beforeend">
        <script remove-me="0s">{`(() => {
          const d = document.getElementById('${dialogId}');
          d.setAttribute('play-sound-volume', '${player.preferences.soundVolume ?? '1.0'}');
          d.dispatchEvent(new CustomEvent('tf2pickup:soundPlay'));
          d.dispatchEvent(new CustomEvent('show'));
        })()`}</script>
      </div>
      <div id="ready-up-notification-container">
        <div
          notification-title="Ready up!"
          notification-body="A game is starting"
          notification-icon="/favicon.png"
        ></div>
      </div>
    </>
  )
}

ReadyUpDialog.close = () => {
  return (
    <>
      <div id="notify-container" hx-swap-oob="beforeend">
        <script remove-me="0s">{`(() => {
          document.getElementById('${dialogId}').dispatchEvent(new CustomEvent('close-dialog'));
        })()`}</script>
      </div>
      <div id="ready-up-notification-container"></div>
    </>
  )
}
