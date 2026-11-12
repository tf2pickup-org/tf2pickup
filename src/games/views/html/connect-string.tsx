import type { Children } from '@kitajs/html'
import type { GameNumber } from '../../../database/models/game.model'
import { IconCheck, IconCopy } from '../../../html/components/icons'

export async function ConnectString(props: {
  connectString?: string | undefined
  gameNumber: GameNumber
  ariaLabel?: string
  children: Children
}) {
  let csBtn = <></>

  if (props.connectString) {
    csBtn = (
      <button
        class="group hover:text-zinc-100"
        copy-to-clipboard={props.connectString}
        data-umami-event="copy-connect-string"
        data-umami-event-game-number={props.gameNumber}
      >
        <IconCopy size={24} class="group-data-copied:hidden" />
        <IconCheck size={24} class="hidden text-green-500 group-data-copied:block" />
        <span class="sr-only group-data-copied:hidden">Copy connect string</span>
        <span class="sr-only hidden group-data-copied:inline">Copied</span>
      </button>
    )
  }

  return (
    <div class="connect-string">
      <div class="content" aria-label={props.ariaLabel} aria-readonly>
        {props.children}
      </div>

      {csBtn}
    </div>
  )
}
