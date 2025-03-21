import { resolve } from 'node:path'
import { bundle } from '../../../html/bundle'
import { getGameLaunchTimeSpans, type GameLaunchTimeSpan } from '../../get-game-launch-time-spans'

export async function GameLaunchTimeSpans() {
  const gameLaunchTimeSpans = await getGameLaunchTimeSpans()
  const data = toChartData(gameLaunchTimeSpans)
  const mainJs = await bundle(resolve(import.meta.dirname, '@client', 'main.ts'))

  return (
    <>
      <span class="text-2xl font-bold text-abru-light-75">Game launch times</span>
      <canvas id="game-launch-time-spans"></canvas>
      <script type="module">
        {`
        import { makeGameLaunchTimeSpansChart } from '${mainJs}';

        const data = ${JSON.stringify(data)};
        makeGameLaunchTimeSpansChart(document.getElementById('game-launch-time-spans'), data);
        `}
      </script>
    </>
  )
}

function toChartData(data: GameLaunchTimeSpan[]) {
  const series = data
    .map(d => ({
      ...d,
      /* From 1..7 to 0..6, where 0 is Monday and 6 is Sunday */
      dayOfWeek: (d.dayOfWeek + 5) % 7,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'morning',
        data: series.filter(d => d.timeOfTheDay === 'morning').map(e => e.count),
        backgroundColor: '#FAFF00',
      },
      {
        label: 'afternoon',
        data: series.filter(d => d.timeOfTheDay === 'afternoon').map(e => e.count),
        backgroundColor: '#A17BCC',
      },
      {
        label: 'evening',
        data: series.filter(d => d.timeOfTheDay === 'evening').map(e => e.count),
        backgroundColor: '#FFCAE9',
      },
      {
        label: 'night',
        data: series.filter(d => d.timeOfTheDay === 'night').map(e => e.count),
        backgroundColor: '#F61059',
      },
    ],
  }
}
