import { nanoid } from 'nanoid'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import type { QueueId } from '../../../database/models/queue.model'
import { collections } from '../../../database/collections'
import { players } from '../../../players'
import { get } from '../../get'

const dialogId = 'ready-up-dialog'

export function ReadyUpDialog() {
  return (
    <>
      <dialog
        class="w-[617px] max-w-[calc(100vw-32px)] rounded-3xl border border-zinc-800 bg-zinc-900 px-8 py-16 drop-shadow-[0px_12px_8px_rgba(0,0,0,0.25)]"
        id={dialogId}
      >
        <form class="flex flex-col items-center gap-8" data-disable-on-submit>
          <div class="flex flex-col items-center gap-6 text-center leading-6 font-bold text-zinc-100">
            <span class="text-[36px]">Game is starting!</span>
            <span class="text-2xl">Are you ready to play?</span>
          </div>

          <div class="flex flex-wrap justify-center gap-4">
            <button
              name="ready"
              value=""
              class="border-crimson-600 bg-crimson-700 hover:bg-crimson-600 flex h-[39px] w-[185px] items-center justify-center rounded-md border px-4 py-2 leading-4 font-bold text-zinc-100 uppercase transition-colors"
              autofocus
              ws-send
              data-umami-event="ready-up"
            >
              I'm ready
            </button>
            <button
              name="leave"
              value=""
              class="flex h-[39px] items-center justify-center rounded-md border border-zinc-600 bg-zinc-700 px-4 py-2 leading-4 font-bold text-zinc-200 transition-colors hover:bg-zinc-600"
              ws-send
              data-umami-event="not-ready"
            >
              Can't play right now
            </button>
          </div>
        </form>
        <div id="ready-up-timer"></div>
      </dialog>
      <div id="ready-up-notification-container" class="hidden"></div>
    </>
  )
}

async function readyUpWindow(queue: QueueId) {
  const captainReady = (await collections.queueState.findOne({ queue }))?.captainReady
  if (captainReady) {
    return { startedAt: captainReady.startedAt, deadline: captainReady.readyUpDeadline }
  }
  const task = await collections.tasks.findOne({
    name: 'queue:readyUpTimeout',
    'args.queue': queue,
  })
  if (!task) return undefined
  const { readyUpTimeout } = await get(queue)
  return { startedAt: new Date(task.at.getTime() - readyUpTimeout), deadline: task.at }
}

function ReadyUpTimer(props: { startedAt: Date; deadline: Date }) {
  const remaining = Math.max(0, props.deadline.getTime() - Date.now())
  const minutes = Math.floor(remaining / minutesToMilliseconds(1))
  const seconds = Math.floor((remaining % minutesToMilliseconds(1)) / secondsToMilliseconds(1))
  return (
    <div
      id="ready-up-timer"
      class="absolute inset-x-[34px] bottom-[18px] flex flex-col items-end gap-[5px]"
      data-phase-timer
      data-phase-start={props.startedAt.getTime()}
      data-phase-deadline={props.deadline.getTime()}
    >
      <span
        class="text-crimson-600 text-sm leading-[14px] font-medium tabular-nums"
        data-countdown={remaining}
        safe
      >
        {[minutes, String(seconds).padStart(2, '0')].join(':')}
      </span>
      <div class="h-1 w-full overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
        <div class="bg-crimson-800 h-full rounded-full" data-phase-progress></div>
      </div>
    </div>
  )
}

ReadyUpDialog.show = async (actor: SteamId64, queue: QueueId) => {
  const [player, readyUp] = await Promise.all([
    players.bySteamId(actor, ['preferences.soundVolume']),
    readyUpWindow(queue),
  ])
  const id = nanoid()
  return (
    <>
      <div id="notify-container" hx-swap-oob="beforeend">
        <div id={id} data-ready-up-dialog-trigger="show"></div>
      </div>
      {readyUp ? <ReadyUpTimer {...readyUp} /> : <div id="ready-up-timer"></div>}
      <div id="ready-up-notification-container">
        <div
          notification-title="Ready up!"
          notification-body="A game is starting"
          notification-icon="/favicon.png"
          data-sound-play="sound-ready-up"
          data-sound-volume={player.preferences.soundVolume ?? 1.0}
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
        <div id={id} data-ready-up-dialog-trigger="close"></div>
      </div>
      <div id="ready-up-notification-container"></div>
    </>
  )
}
