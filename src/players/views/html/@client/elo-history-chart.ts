import { Chart, type ChartConfiguration } from 'chart.js/auto'

export interface EloDataPoint {
  gameNumber: number
  date: string
  elo: number
}

export type EloHistoryData = Record<string, EloDataPoint[]>
export type SkillData = Record<string, (number | null)[]>
export type XAxisMode = 'time' | 'game'

const colors: Record<string, string> = {
  scout: '#7ec8e3',
  soldier: '#f0a500',
  pyro: '#ff6b35',
  demoman: '#9b59b6',
  heavy: '#e74c3c',
  engineer: '#f1c40f',
  medic: '#2ecc71',
  sniper: '#1abc9c',
  spy: '#e91e63',
}

function buildChartConfig(
  points: EloDataPoint[],
  gameClass: string,
  xMode: XAxisMode,
  skillPoints?: (number | null)[],
): ChartConfiguration<'line'> {
  const color = colors[gameClass] ?? '#F61059'
  const labels =
    xMode === 'time'
      ? points.map(p => new Date(p.date).toLocaleDateString())
      : points.map(p => `#${p.gameNumber}`)

  const hasSkill = skillPoints?.some(v => v !== null)

  const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
    {
      label: 'ELO',
      data: points.map(p => p.elo),
      fill: false,
      borderWidth: 2,
      borderColor: color,
      pointBackgroundColor: color,
      pointRadius: 3,
      tension: 0.1,
      yAxisID: 'y',
    },
  ]

  if (hasSkill) {
    datasets.push({
      label: 'Skill',
      data: skillPoints as number[],
      fill: false,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.65)',
      pointBackgroundColor: 'rgba(255,255,255,0.65)',
      pointRadius: 3,
      tension: 0,
      stepped: true,
      borderDash: [5, 4],
      yAxisID: 'y1',
      spanGaps: false,
    })
  }

  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      animation: false,
      responsive: true,
      plugins: {
        legend: {
          display: hasSkill,
          labels: { color: '#C7C4C7' },
        },
        tooltip: {
          callbacks: {
            title: items => labels[items[0]!.dataIndex] ?? '',
            label: item =>
              item.dataset.label === 'Skill'
                ? `Skill: ${item.raw as number}`
                : `ELO: ${item.raw as number}`,
          },
        },
      },
      scales: {
        x: {
          border: { color: '#D9D9D9' },
          grid: { color: 'rgba(217,217,217,0.15)' },
          ticks: {
            color: '#C7C4C7',
            maxTicksLimit: 12,
          },
        },
        y: {
          border: { color: '#D9D9D9' },
          grid: { color: 'rgba(217,217,217,0.15)' },
          ticks: { color: '#C7C4C7' },
          position: 'left',
        },
        ...(hasSkill
          ? {
              y1: {
                border: { color: 'rgba(255,255,255,0.3)' },
                grid: { drawOnChartArea: false },
                ticks: { color: 'rgba(255,255,255,0.65)' },
                position: 'right' as const,
              },
            }
          : {}),
      },
    },
  }
}

export function initEloHistoryChart(data: EloHistoryData, skillData?: SkillData) {
  const canvas = document.getElementById('elo-history-canvas') as HTMLCanvasElement | null
  if (!canvas) return

  const classTabs = document.querySelectorAll<HTMLElement>('[data-elo-class]')
  const xAxisBtns = document.querySelectorAll<HTMLElement>('[data-elo-xaxis]')
  const emptyNotice = document.getElementById('elo-history-empty')

  let activeClass = classTabs[0]?.dataset['eloClass'] ?? ''
  let xMode: XAxisMode = 'time'
  let chart: Chart | null = null

  function refresh() {
    const points = data[activeClass] ?? []

    if (emptyNotice) {
      emptyNotice.hidden = points.length > 0
    }
    canvas!.hidden = points.length === 0

    if (points.length === 0) {
      chart?.destroy()
      chart = null
      return
    }

    const config = buildChartConfig(points, activeClass, xMode, skillData?.[activeClass])

    if (chart) {
      chart.data = config.data
      chart.options = config.options!
      chart.update()
    } else {
      chart = new Chart(canvas!, config)
    }
  }

  classTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      classTabs.forEach(t => {
        t.dataset['active'] = t === tab ? 'true' : 'false'
      })
      activeClass = tab.dataset['eloClass'] ?? ''
      refresh()
    })
  })

  xAxisBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      xAxisBtns.forEach(b => {
        b.dataset['active'] = b === btn ? 'true' : 'false'
      })
      xMode = (btn.dataset['eloXaxis'] ?? 'time') as XAxisMode
      refresh()
    })
  })

  refresh()
}
