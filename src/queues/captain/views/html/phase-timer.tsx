import type { Children } from '@kitajs/html'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'

export function PhaseTimer(props: { startedAt: Date; deadline: Date; children: Children }) {
  const remaining = Math.max(0, props.deadline.getTime() - Date.now())
  const minutes = Math.floor(remaining / minutesToMilliseconds(1))
  const seconds = Math.floor((remaining % minutesToMilliseconds(1)) / secondsToMilliseconds(1))
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
        <span class="text-crimson-600 tabular-nums" data-countdown={remaining} aria-hidden="true">
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
        <span class="font-medium">{props.children}</span>
      </div>
      <div class="h-1 overflow-hidden bg-zinc-800" aria-hidden="true">
        <div class="bg-crimson-600 h-full" data-phase-progress></div>
      </div>
    </div>
  )
}
