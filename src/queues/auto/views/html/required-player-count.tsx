export function RequiredPlayerCount(props: { required: number; oob?: boolean }) {
  return (
    <span id="queue-required-player-count" {...(props.oob ? { 'hx-swap-oob': 'true' } : {})}>
      {props.required}
    </span>
  )
}
