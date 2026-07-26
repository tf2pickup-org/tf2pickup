import { resolve } from 'node:path'
import { bundle } from '../../../html/bundle'
import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { queue } from '../../../queue-auto'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { defaultElo } from '../../../games/calculate-elo-updates'
import type { EloDataPoint, EloHistoryData, SkillData } from './@client/elo-history-chart'

export async function EloHistoryChart(props: { steamId: SteamId64 }) {
  const player = await players.bySteamId(props.steamId, ['eloHistory', 'skillHistory'])
  const mainJs = await bundle(resolve(import.meta.dirname, '@client', 'elo-history-chart.ts'))

  const classes = queue.config.classes.map(c => c.name)
  const data = buildChartData(player.eloHistory ?? [])
  const skillData = buildSkillData(data, player.skillHistory ?? [])

  return (
    <div class="mt-6">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1">
          {classes.map((gameClass, i) => (
            <button
              class="elo-class-tab flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors"
              data-elo-class={gameClass}
              data-active={i === 0 ? 'true' : 'false'}
            >
              <GameClassIcon gameClass={gameClass} size={16} />
              <span class="capitalize">{gameClass}</span>
            </button>
          ))}
        </div>

        <div class="flex gap-1">
          <button
            class="rounded px-2.5 py-1 text-sm transition-colors"
            data-elo-xaxis="time"
            data-active="true"
          >
            Over time
          </button>
          <button
            class="rounded px-2.5 py-1 text-sm transition-colors"
            data-elo-xaxis="game"
            data-active="false"
          >
            By game #
          </button>
        </div>
      </div>

      <p id="elo-history-empty" class="text-abru-light-50 text-sm italic" hidden>
        No ELO history for this class yet.
      </p>
      <canvas id="elo-history-canvas"></canvas>

      <style>{`
        .elo-class-tab[data-active="true"],
        [data-elo-xaxis][data-active="true"] {
          background-color: rgba(246, 16, 89, 0.2);
          color: #f61059;
        }
        .elo-class-tab[data-active="false"],
        [data-elo-xaxis][data-active="false"] {
          background-color: rgba(255,255,255,0.05);
          color: #C7C4C7;
        }
        .elo-class-tab[data-active="false"]:hover,
        [data-elo-xaxis][data-active="false"]:hover {
          background-color: rgba(255,255,255,0.1);
        }
      `}</style>

      <script type="module">
        {`
        import { initEloHistoryChart } from '${mainJs}';
        const data = ${JSON.stringify(data)};
        const skillData = ${JSON.stringify(skillData)};
        initEloHistoryChart(data, skillData, ${JSON.stringify(defaultElo)});
        `}
      </script>
    </div>
  )

  function buildChartData(
    history: { at: Date; elo: Record<string, number>; game: number }[],
  ): EloHistoryData {
    const result: EloHistoryData = {}
    for (const gameClass of classes) {
      const points: EloDataPoint[] = history
        .filter(entry => entry.elo[gameClass] !== undefined)
        .sort((a, b) => a.game - b.game)
        .slice(-100)
        .map(entry => ({
          gameNumber: entry.game,
          date: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
          elo: entry.elo[gameClass]!,
        }))
      result[gameClass] = points
    }
    return result
  }

  function buildSkillData(
    eloData: EloHistoryData,
    skillHistory: { at: Date; skill: Record<string, number> }[],
  ): SkillData {
    const result: SkillData = {}
    const sorted = [...skillHistory].sort((a, b) => a.at.getTime() - b.at.getTime())
    for (const gameClass of classes) {
      result[gameClass] = (eloData[gameClass] ?? []).map(point => {
        const pointDate = new Date(point.date)
        const entry = sorted.filter(s => s.at <= pointDate).at(-1)
        return entry?.skill[gameClass] ?? null
      })
    }
    return result
  }
}
