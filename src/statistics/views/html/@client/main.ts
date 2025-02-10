import { Chart, type ChartData } from 'chart.js/auto'

export function makePlayedMapsCountChart(element: HTMLCanvasElement, data: ChartData<'pie'>) {
  new Chart(element, {
    type: 'pie',
    data,
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
