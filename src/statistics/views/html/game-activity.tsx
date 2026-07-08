import { addDays, format, getMonth, isSameMonth, parseISO, startOfWeek } from 'date-fns'
import { getGameLaunchesPerDay } from '../../get-game-launches-per-day'

const activityLevels = [0, 1, 2, 3, 4] as const

const weekdayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''] as const

export async function GameActivity() {
  const now = new Date()
  const launches = await getGameLaunchesPerDay()
  const counts = new Map(launches.map(({ day, count }) => [day, count]))
  const total = launches.reduce((sum, { count }) => sum + count, 0)
  const max = Math.max(1, ...counts.values())
  const firstDay = launches.length > 0 ? parseISO(launches.map(({ day }) => day).sort()[0]!) : now

  const start = startOfWeek(firstDay, { weekStartsOn: 1 })
  const weeks: Date[][] = []
  for (let day = start; day <= now; day = addDays(day, 1)) {
    if (weeks.length === 0 || day.getDay() === 1) {
      weeks.push([])
    }
    weeks.at(-1)!.push(day)
  }

  return (
    <div>
      <div class="mb-4 flex items-center gap-4">
        <span class="text-abru-light-75 text-2xl font-bold">Game activity</span>
        <span class="text-abru-light-50 text-sm">
          {total} games launched since <span safe>{format(firstDay, 'MMMM yyyy')}</span>
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex">
          <div class="grid w-8 shrink-0 grid-rows-7 gap-[3px] pt-[19px] pr-2">
            {weekdayLabels.map(label => (
              <span class="text-abru-light-50 flex h-3 items-center text-[10px] leading-none">
                {label}
              </span>
            ))}
          </div>

          <div
            id="game-activity-scroll"
            class="scrollbar-thin [scrollbar-color:var(--color-abru-light-30)_transparent] overflow-x-auto pb-1"
          >
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
                    class={`overflow-visible text-xs leading-4 whitespace-nowrap ${isYearMark ? 'text-abru-light-75 font-bold' : 'text-abru-light-50'}`}
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
                  const count = counts.get(format(day, 'yyyy-MM-dd')) ?? 0
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

        <div class="activity-cells text-abru-light-50 flex items-center gap-1 self-end text-xs">
          Less
          {activityLevels.map(level => (
            <div data-activity={level === 0 ? undefined : `${level}`}></div>
          ))}
          More
        </div>
      </div>

      <script type="module">
        {`
        const scroll = document.getElementById('game-activity-scroll');
        scroll.scrollLeft = scroll.scrollWidth;
        `}
      </script>
    </div>
  )
}

function cellLevel(count: number, max: number): number {
  if (count === 0) {
    return 0
  }
  return Math.min(4, Math.ceil((count / max) * 4))
}
