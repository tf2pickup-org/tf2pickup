import { Chart } from 'chart.js/auto'

export function makePlayerMapsCountChart(
  /** @type HTMLCanvasElement */ element,
  /** @type import('chart.js').ChartData */ data,
) {
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
