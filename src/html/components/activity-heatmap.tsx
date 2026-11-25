import { addDays, format, getMonth, isSameMonth, startOfWeek } from 'date-fns'

const activityLevels = [0, 1, 2, 3, 4] as const

const weekdayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const

// Games per day, one column per week from `since` up to today.
export function ActivityHeatmap(props: { counts: Map<string, number>; since: Date }) {
  const now = new Date()
  const max = Math.max(1, ...props.counts.values())

  const weeks: Date[][] = []
  for (let day = startOfWeek(props.since); day <= now; day = addDays(day, 1)) {
    if (weeks.length === 0 || day.getDay() === 0) {
      weeks.push([])
    }
    weeks.at(-1)!.push(day)
  }

  return (
    <div class="flex flex-col gap-2">
      <div class="flex">
        <div class="grid w-8 shrink-0 grid-rows-[repeat(7,12px)] gap-[3px] pt-[19px] pr-2">
          {weekdayLabels.map(label => (
            <span class="flex h-3 items-center text-[10px] leading-none text-zinc-400">
              {label}
            </span>
          ))}
        </div>

        <div class="flex scrollbar-thin [scrollbar-color:var(--color-zinc-500)_transparent] flex-row-reverse overflow-x-auto pb-1">
          <div>
            <div
              class="mb-[3px] grid h-4 gap-[3px]"
              style={`grid-template-columns: repeat(${weeks.length}, 12px)`}
            >
              {weeks.map((week, i) => {
                const last = week.at(-1)!
                if (i > 0 && isSameMonth(last, weeks[i - 1]!.at(-1)!)) {
                  return <span></span>
                }

                const isYearMark = getMonth(last) === 0
                return (
                  <span
                    safe
                    class={`overflow-visible text-xs leading-4 whitespace-nowrap ${isYearMark ? 'font-bold text-zinc-200' : 'text-zinc-400'}`}
                  >
                    {format(last, isYearMark ? 'yyyy' : 'MMM')}
                  </span>
                )
              })}
            </div>

            <div
              class="activity-cells grid grid-flow-col grid-rows-7 gap-[3px]"
              style={`grid-template-columns: repeat(${weeks.length}, 12px)`}
            >
              {weeks.map(week =>
                week.map(day => {
                  const count = props.counts.get(format(day, 'yyyy-MM-dd')) ?? 0
                  const level = cellLevel(count, max)
                  return (
                    <div
                      data-activity={level === 0 ? undefined : `${level}`}
                      title={`${count} ${count === 1 ? 'game' : 'games'} on ${format(day, 'MMM d, yyyy')}`}
                    ></div>
                  )
                }),
              )}
            </div>
          </div>
        </div>
      </div>

      <div class="activity-cells flex items-center gap-1 self-end text-xs text-zinc-400">
        Less
        {activityLevels.map(level => (
          <div data-activity={level === 0 ? undefined : `${level}`}></div>
        ))}
        More
      </div>
    </div>
  )
}

function cellLevel(count: number, max: number): number {
  if (count === 0) {
    return 0
  }
  return Math.min(4, Math.ceil((count / max) * 4))
}
