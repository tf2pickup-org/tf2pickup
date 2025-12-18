import { nanoid } from 'nanoid'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { players } from '../../../players'

const dialogId = 'ready-up-dialog'

export function ReadyUpDialog() {
  return (
    <>
      <dialog
        class="w-[616px] rounded-xl bg-abru-dark-29 px-[59px] py-[42px] shadow-xl"
        id={dialogId}
        _={`
        on show me.showModal() then remove [@disabled] from <#${dialogId} button/> end
        on close me.close() end
      `}
      >
        <form
          class="flex flex-col items-center gap-11"
          _={`on submit add [@disabled] to <#${dialogId} button/>`}
        >
          <div class="flex flex-col items-center text-[32px] font-bold text-abru-light-75">
            <span>Game is starting!</span>
            <span>Are you ready to play?</span>
          </div>

          <div class="flex flex-col gap-4">
            <button
              name="ready"
              value=""
              class="w-[242px] rounded-sm bg-accent-600 py-[12px] text-xl font-bold uppercase text-gray-50"
              autofocus
              ws-send
              data-umami-event="ready-up"
            >
              I'm ready
            </button>
            <button
              name="leave"
              value=""
              class="w-[242px] rounded-sm bg-abru-light-5 py-[12px] text-xl font-bold text-gray-50"
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
  const id = nanoid()
  return (
    <>
      <div id="notify-container" hx-swap-oob="beforeend">
        <div id={id} _={`on load trigger show on #${dialogId} then remove me`}></div>
      </div>
      <div id="ready-up-notification-container">
        <div
          notification-title="Ready up!"
          notification-body="A game is starting"
          notification-icon="/favicon.png"
          play-sound-src="/sounds/ready_up.webm"
          play-sound-volume={player.preferences.soundVolume ?? '1.0'}
        ></div>
      </div>
    </>
  )
}

ReadyUpDialog.close = () => {
  const id = nanoid()
  return (
    <>
      <div id="notify-container" hx-swap-oob="beforeend">
        <div id={id} _={`on load trigger close on #${dialogId} then remove me`}></div>
      </div>
      <div id="ready-up-notification-container"></div>
    </>
  )
}
