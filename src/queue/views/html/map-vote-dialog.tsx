import { nanoid } from 'nanoid'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { MapVote } from './map-vote'
import { configuration } from '../../../configuration'

const dialogId = 'map-vote-dialog'

export function MapVoteDialog() {
  return (
    <dialog
      class="bg-abru-dark-29 w-[800px] rounded-xl px-[59px] py-[42px] shadow-xl"
      id={dialogId}
      _={`
        on show me.showModal() end
        on close me.close() end
      `}
    >
      <div class="flex flex-col gap-6">
        <div class="text-abru-light-75 flex flex-col items-center text-[32px] font-bold">
          <span>Vote for a map!</span>
          <span id="map-vote-dialog-timer" class="text-xl font-normal"></span>
        </div>
        <div id="map-vote-dialog-content"></div>
      </div>
    </dialog>
  )
}

MapVoteDialog.show = async (actor: SteamId64 | undefined, isInQueue: boolean) => {
  const timeout = await configuration.get('queue.map_vote_timeout')
  const seconds = Math.ceil(timeout / 1000)
  const id = nanoid()
  return (
    <>
      <div id="map-vote-dialog-content" hx-swap-oob="innerHTML">
        {await MapVote({ actor: isInQueue ? actor : undefined })}
      </div>
      <div id="notify-container" hx-swap-oob="beforeend">
        <div
          id={id}
          _={`
            on load
              trigger show on #${dialogId}
              set :t to ${seconds}
              put :t + 's' into #map-vote-dialog-timer
              repeat until :t <= 0
                wait 1s
                decrement :t
                put :t + 's' into #map-vote-dialog-timer
              end
              remove me
            end
          `}
        ></div>
      </div>
    </>
  )
}

MapVoteDialog.close = () => {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div id={id} _={`on load trigger close on #${dialogId} then remove me`}></div>
    </div>
  )
}
