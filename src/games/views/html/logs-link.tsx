import type { GameModel } from '../../../database/models/game.model'
import { IconDeviceDesktopAnalytics } from '../../../html/components/icons'

export function LogsLink(props: { game: GameModel }) {
  const id = `game-${props.game.number}-logs-link`
  return props.game.logsUrl ? (
    <a
      id={id}
      href={props.game.logsUrl}
      target="_blank"
      class="game-summary-link"
      rel="noreferrer"
      data-umami-event="link-logs"
      data-umami-event-game-number={props.game.number}
      data-umami-event-game-state={props.game.state}
    >
      <IconDeviceDesktopAnalytics />
      logs
    </a>
  ) : (
    <div id={id} class="hidden"></div>
  )
}
