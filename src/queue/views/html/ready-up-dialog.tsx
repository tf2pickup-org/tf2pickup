import { nanoid } from 'nanoid'

const dialogId = 'ready-up-dialog'

export function ReadyUpDialog() {
  return (
    <dialog
      class="w-[616px] rounded-xl bg-abru-dark-29 px-[59px] py-[42px] shadow-xl"
      id={dialogId}
      _={`
        on show remove [@disabled] from <#${dialogId} button/> then me.showModal() end
        on close me.close() end
      `}
    >
      <form
        class="flex flex-col items-center gap-11"
        ws-send
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
            class="w-[242px] rounded bg-accent-600 py-[12px] text-xl font-bold uppercase text-gray-50"
            autofocus=""
          >
            I'm ready
          </button>
          <button
            name="leave"
            value=""
            class="w-[242px] rounded bg-abru-light-5 py-[12px] text-xl font-bold text-gray-50"
          >
            No, I can't play now
          </button>
        </div>
      </form>
    </dialog>
  )
}

ReadyUpDialog.show = () => {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div id={id} _={`on load trigger show on #${dialogId} then remove me`}></div>
    </div>
  )
}

ReadyUpDialog.close = () => {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div id={id} _={`on load trigger close on #${dialogId} then remove me`}></div>
    </div>
  )
}
