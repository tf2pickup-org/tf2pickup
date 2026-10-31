export function QueueSwitcherCount(props: { slug: string; current: number; required: number }) {
  return (
    <span id={`queue-switcher-count-${props.slug}`} class="font-normal tabular-nums">
      {props.current}/{props.required}
    </span>
  )
}
