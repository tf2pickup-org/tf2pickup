import { Chart, type ChartData } from 'chart.js/auto'

export function makePlayedMapsCountChart(element: HTMLCanvasElement, data: ChartData<'pie'>) {
  new Chart(element, {
    type: 'pie',
    data,
    options: {
      aspectRatio: 1.5,
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
            padding: 12,
          },
        },
      },
    },
  })
}

export function makeGameLaunchTimeSpansChart(element: HTMLCanvasElement, data: ChartData<'bar'>) {
  new Chart(element, {
    type: 'bar',
    data,
    options: {
      indexAxis: 'y',
      aspectRatio: 2,
      scales: {
        y: {
          stacked: true,
          ticks: {
            color: '#C7C4C7',
          },
          border: {
            color: '#D9D9D9',
          },
        },
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
