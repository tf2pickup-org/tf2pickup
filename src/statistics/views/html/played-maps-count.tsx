import { dropRight, takeRight } from 'es-toolkit'
import { getPlayedMapsCount, type PlayedMapCount } from '../../get-played-maps-count'
import { bundle } from '../../../html/bundle'
import { resolve } from 'node:path'

export async function PlayedMapsCount() {
  const playedMapsCount = await getPlayedMapsCount()
  const data = toChartData(playedMapsCount)
  const mainJs = await bundle(resolve(import.meta.dirname, '@client', 'main.ts'))

  return (
    <>
      <h2 class="mb-6 text-2xl leading-[1.5] font-bold">Most played maps</h2>
      <div class="mx-auto my-auto w-full max-w-[26rem]">
        <canvas id="played-maps-count"></canvas>
      </div>
      <script type="module">
        {`
        import { makePlayedMapsCountChart } from '${mainJs}';

        const data = ${JSON.stringify(data)};
        makePlayedMapsCountChart(document.getElementById('played-maps-count'), data);
        `}
      </script>
    </>
  )
}

const backgroundColor = [
  '#F61059',
  '#FFCAE9',
  '#A17BCC',
  '#E5EB00',
  '#FF7700',
  '#06D6A0',
  '#573280',
  '#4392F1',
  '#AED4E6',
]

function toChartData(data: PlayedMapCount[]) {
  const lastFewMaps = takeRight(data, Math.max(0, data.length - 8))
  const other: PlayedMapCount = {
    mapName: 'other',
    count: lastFewMaps.reduce((sum: number, d: PlayedMapCount) => sum + d.count, 0),
  }
  const topMaps = dropRight(data, Math.max(0, data.length - 8)).concat(other)

  return {
    labels: topMaps.map((d: PlayedMapCount) => d.mapName),
    datasets: [
      {
        data: topMaps.map((d: PlayedMapCount) => d.count),
        backgroundColor,
        borderWidth: 2,
        borderColor: '#18181B',
        hoverOffset: 4,
      },
    ],
  }
}
