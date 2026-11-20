import type { Children } from '@kitajs/html'
import { formatCountdown } from '../../../../shared/format-countdown'

export function PhaseTimer(props: { startedAt: Date; deadline: Date; children: Children }) {
  const remaining = Math.max(0, props.deadline.getTime() - Date.now())
  return (
    <div
      class="flex flex-col gap-2 text-sm text-zinc-200"
      role="status"
      aria-live="polite"
      data-phase-timer
      data-phase-start={props.startedAt.getTime()}
      data-phase-deadline={props.deadline.getTime()}
      style={`--deadline: ${props.deadline.getTime()}`}
    >
      <div class="flex items-center gap-2">
        <span
          class="text-crimson-600 tabular-nums"
          data-countdown={remaining}
          aria-hidden="true"
          safe
        >
          {formatCountdown(remaining)}
        </span>
        <span class="font-medium">{props.children}</span>
      </div>
      <div class="h-1 overflow-hidden bg-zinc-800" aria-hidden="true">
        <div class="bg-crimson-600 h-full" data-phase-progress></div>
      </div>
    </div>
  )
}
