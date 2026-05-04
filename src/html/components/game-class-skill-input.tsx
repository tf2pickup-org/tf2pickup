import type { Children } from '@kitajs/html'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { GameClassIcon } from './game-class-icon'

export function GameClassSkillInput(props: {
  gameClass: Tf2ClassName
  value: number
  step?: number
  name?: undefined | string
  id?: undefined | string
  style?: undefined | string
  children?: undefined | Children
}) {
  const id = props.id ?? `playerSkill-${props.gameClass}`
  const step = props.step ?? 1.0
  return (
    <div class="game-class-skill-input" style={props.style} data-skill-spinner>
      <GameClassIcon gameClass={props.gameClass} size={32} />
      <label class="sr-only" for={id}>
        Player's skill on {props.gameClass}
      </label>
      <button type="button" class="skill-spinner-btn" data-action="decrement" aria-label="Decrease">
        {'‹'}
      </button>
      <span class="skill-spinner-display" aria-live="polite">
        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */}
        {props.value.toString() as 'safe'}
      </span>
      <input
        type="number"
        id={id}
        name={props.name}
        value={props.value.toString()}
        required
        step={step.toString()}
        class="sr-only"
      />
      <button type="button" class="skill-spinner-btn" data-action="increment" aria-label="Increase">
        {'›'}
      </button>
      {props.children}
    </div>
  )
}
