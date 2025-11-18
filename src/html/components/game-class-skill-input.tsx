import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { GameClassIcon } from './game-class-icon'

export function GameClassSkillInput(props: {
  gameClass: Tf2ClassName
  value: number
  name?: undefined | string
  id?: undefined | string
  style?: undefined | string
}) {
  const id = props.id ?? `playerSkill-${props.gameClass}`
  return (
    <div class="game-class-skill-input" style={props.style}>
      <GameClassIcon gameClass={props.gameClass} size={32} />
      <label class="sr-only" for={id}>
        Player's skill on {props.gameClass}
      </label>
      <input
        type="number"
        id={id}
        name={props.name}
        value={props.value.toString()}
        required
        step=".5"
      />
    </div>
  )
}
