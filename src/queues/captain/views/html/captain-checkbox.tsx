import { IconCheck } from '../../../../html/components/icons'

// The 24px checkbox of the captain page (D3): dark when unchecked, light with a dark check when
// checked. Toggling sends `vals` over the websocket.
export function CaptainCheckbox(props: {
  label: string
  checked: boolean
  disabled: boolean
  vals: Record<string, string>
  event: string
  eventRole?: string | undefined
}) {
  return (
    <span class="relative inline-flex size-6 shrink-0">
      <input
        type="checkbox"
        class="peer size-6 appearance-none rounded-sm border border-zinc-800 bg-zinc-950 checked:border-zinc-200 checked:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-100 disabled:opacity-50"
        aria-label={props.label}
        checked={props.checked}
        disabled={props.disabled}
        ws-send
        hx-vals={JSON.stringify(props.vals)}
        hx-trigger="change"
        data-umami-event={props.event}
        data-umami-event-role={props.eventRole}
      />
      <IconCheck
        size={20}
        stroke={3}
        class="pointer-events-none absolute inset-0.5 hidden text-zinc-900 peer-checked:block"
      />
    </span>
  )
}
