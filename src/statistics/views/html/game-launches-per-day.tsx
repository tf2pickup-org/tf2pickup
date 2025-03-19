import { sub } from 'date-fns'
import { getGameLaunchesPerDay, type GameLaunchesPerDay } from '../../get-game-launches-per-day'
import { bundle } from '../../../html/bundle'
import { resolve } from 'node:path'

export async function GameLaunchesPerDay() {
  const gameLaunchesPerDay = await getGameLaunchesPerDay(sub(new Date(), { years: 1 }))
  const data = toChartData(gameLaunchesPerDay)
  const mainJs = await bundle(resolve(import.meta.dirname, '@client', 'main.ts'))

  return (
    <>
      <span class="text-2xl font-bold text-abru-light-75">Game launches per day</span>
      <canvas id="game-launches-per-day"></canvas>
      <script type="module">
        {`
        import { makeGameLaunchesPerDayChart } from '${mainJs}';

        const data = ${JSON.stringify(data)};
        makeGameLaunchesPerDayChart(document.getElementById('game-launches-per-day'), data);
        `}
      </script>
    </>
  )
}

function toChartData(data: GameLaunchesPerDay[]) {
  const date = sub(Date.now(), { months: 1 })
  const end = new Date()
  const ordered: GameLaunchesPerDay[] = []

  while (date < end) {
    const day = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })

    const monthNumeric = `0${date.getMonth() + 1}`.slice(-2)
    const dateNumeric = `0${date.getDate()}`.slice(-2)
    const lookupDay = `${date.getFullYear()}-${monthNumeric}-${dateNumeric}`

    ordered.push({
      day,
      count: data.find(d => d.day === lookupDay)?.count ?? 0,
    })

    date.setDate(date.getDate() + 1)
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
