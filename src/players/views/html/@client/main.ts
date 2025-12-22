import { Chart, type ChartData } from 'chart.js/auto'

export function makeSkillHistoryChart(element: HTMLCanvasElement, data: ChartData<'line'>) {
  new Chart(element, {
    type: 'line',
    data,
    options: {
      spanGaps: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          border: {
            color: '#D9D9D9',
          },
          grid: {
            color: 'rgba(217, 217, 217, 0.2)',
          },
          ticks: {
            color: '#C7C4C7',
          },
        },
      },
    },
  })
}
