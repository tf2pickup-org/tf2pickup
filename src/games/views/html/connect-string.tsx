import type { GameNumber } from '../../../database/models/game.model'
import { IconCopy } from '../../../html/components/icons'

interface NoConnectStringAvailable {
  status: string
}

interface ConnectStringAvailable {
  connectString: string
}

export async function ConnectString(
  props: (NoConnectStringAvailable | ConnectStringAvailable) & { gameNumber: GameNumber },
) {
  let csBoxContent: JSX.Element
  let csBtn = <></>
  if ('status' in props) {
    csBoxContent = <i safe>{props.status}</i>
  } else {
    csBoxContent = props.connectString
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
    <div class="connect-string">
      <div class="content" aria-label="Connect string" aria-readonly>
        {csBoxContent}
      </div>

      {csBtn}
    </div>
  )
}
