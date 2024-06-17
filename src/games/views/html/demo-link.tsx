import type { GameModel } from '../../../database/models/game.model'
import { IconMovie } from '../../../html/components/icons'

export function DemoLink(props: { game: GameModel }) {
  const id = `game-${props.game.number}-demo-link`
  return props.game.demoUrl ? (
    <a id={id} href={props.game.demoUrl} target="_blank" class="game-summary-link">
      <IconMovie />
      demo
    </a>
  ) : (
    <div id={id} class="hidden"></div>
  )
}
