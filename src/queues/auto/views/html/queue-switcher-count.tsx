export function QueueSwitcherCount(props: { slug: string; current: number; required: number }) {
  return (
    <span id={`queue-switcher-count-${props.slug}`} class="queue-switcher-count">
      {props.current}/{props.required}
    </span>
  )
}
