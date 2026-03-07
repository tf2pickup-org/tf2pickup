import { addDays, format, sub } from 'date-fns'
import { getGameLaunchesPerDay, type GameLaunchesPerDay } from '../../get-game-launches-per-day'
import { bundle } from '../../../html/bundle'
import { resolve } from 'node:path'

export const gameLaunchesPerDaySpans = ['week', 'month', 'year'] as const
export type GameLaunchesPerDaySpan = (typeof gameLaunchesPerDaySpans)[number]

export async function GameLaunchesPerDay(props?: { span?: GameLaunchesPerDaySpan }) {
  const span = props?.span ?? 'month'
  const start = spanToStart(span)
  const gameLaunchesPerDay = await getGameLaunchesPerDay(start)
  const data = toChartData(gameLaunchesPerDay, start)
  const mainJs = await bundle(resolve(import.meta.dirname, '@client', 'main.ts'))

  return (
    <div id="game-launches-per-day-container">
      <div class="mb-4 flex items-center gap-4">
        <span class="text-abru-light-75 text-2xl font-bold">Game launches per day</span>
        <select
          hx-get="/statistics/game-launches-per-day"
          hx-target="#game-launches-per-day-container"
          hx-swap="outerHTML"
          name="span"
        >
          <option value="week" selected={span === 'week'}>
            last week
          </option>
          <option value="month" selected={span === 'month'}>
            last month
          </option>
          <option value="year" selected={span === 'year'}>
            last year
          </option>
        </select>
      </div>
      <canvas id="game-launches-per-day"></canvas>
      <script type="module">
        {`
        import { makeGameLaunchesPerDayChart } from '${mainJs}';

        const data = ${JSON.stringify(data)};
        makeGameLaunchesPerDayChart(document.getElementById('game-launches-per-day'), data);
        `}
      </script>
    </div>
  )
}

function spanToStart(span: GameLaunchesPerDaySpan): Date {
  switch (span) {
    case 'week':
      return sub(new Date(), { weeks: 1 })
    case 'month':
      return sub(new Date(), { months: 1 })
    case 'year':
      return sub(new Date(), { years: 1 })
  }
}

function toChartData(data: GameLaunchesPerDay[], start: Date) {
  let date = start
  const end = new Date()
  const ordered: GameLaunchesPerDay[] = []

  while (date < end) {
    const day = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })

    const lookupDay = format(date, 'yyyy-MM-dd')

    ordered.push({
      day,
      count: data.find(d => d.day === lookupDay)?.count ?? 0,
    })

    date = addDays(date, 1)
  }

  return {
    labels: ordered.map(d => d.day),
    datasets: [
      {
        data: ordered.map(d => d.count),
        fill: false,
        borderWidth: 1,
        borderColor: '#F61059',
        pointBackgroundColor: '#F61059',
        spanGaps: true,
        pointRadius: 2,
      },
    ],
  }
}
