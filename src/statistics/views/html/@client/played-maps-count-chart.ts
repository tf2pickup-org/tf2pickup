import { Chart, type ChartData } from 'chart.js'

export function makePlayerMapsCountChart(element: HTMLCanvasElement, data: ChartData) {
  new Chart(element, {
    type: 'pie',
    data: data,
    options: {
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 14,
            boxHeight: 14,
            font: {
              size: 14,
            },
            color: '#C7C4C7',
            padding: 16,
          },
        },
      },
    },
  })
}
