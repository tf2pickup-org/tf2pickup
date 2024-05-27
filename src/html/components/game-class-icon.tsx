import { Tf2ClassName } from '../../shared/types/tf2-class-name'

export function GameClassIcon(props: { gameClass: Tf2ClassName; size?: number }) {
  const size = props.size ?? 64
  return (
    <img
      src={`/game-class-icons/${props.gameClass}-64x64.png`}
      alt={props.gameClass}
      class="inline-block"
      style={`width: ${size}px; height: ${size}px;`}
    />
  )
}
