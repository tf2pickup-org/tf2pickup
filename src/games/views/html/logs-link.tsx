import type { GameModel } from '../../../database/models/game.model'
import { IconDeviceDesktopAnalytics } from '../../../html/components/icons'

export function LogsLink(props: { game: GameModel }) {
  const id = `game-${props.game.number}-logs-link`
  return props.game.logsUrl ? (
    <a id={id} href={props.game.logsUrl} target="_blank" class="game-summary-link">
      <IconDeviceDesktopAnalytics />
      logs
    </a>
  ) : (
    <div id={id} class="hidden"></div>
  )
}
