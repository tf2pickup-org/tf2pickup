import type { Children } from '@kitajs/html'
import type { GameNumber } from '../../../database/models/game.model'
import { IconCopy } from '../../../html/components/icons'

export async function ConnectString(props: {
  connectString?: string | undefined
  gameNumber: GameNumber
  id?: undefined | number | string
  children: Children
}) {
  let csBtn = <></>

  if (props.connectString) {
    csBtn = (
      <button
        class="hover:text-abru-light-85"
        copy-to-clipboard={props.connectString}
        data-umami-event="copy-connect-string"
        data-umami-event-game-number={props.gameNumber}
      >
        <IconCopy size={24} />
        <span class="sr-only">Copy connect string</span>
      </button>
    )
  }

  return (
    <div class="connect-string" id={props.id}>
      <div class="content" aria-label="Connect string" aria-readonly>
        {props.children}
      </div>

      {csBtn}
    </div>
  )
}
