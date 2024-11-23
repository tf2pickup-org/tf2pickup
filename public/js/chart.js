// https://github.com/chartjs/Chart.js/issues/11592#issuecomment-2475600760
import {
  Chart,
  PieController,
  ArcElement,
  registerables,
} from 'https://esm.sh/chart.js@4.4.6?bundle-deps&exports=Chart,PieController,ArcElement,registerables'

// to register everything
Chart.register(...registerables)

// to register some, but really only makes sense with `?exports=`
// for what can be exported, see https://www.chartjs.org/docs/latest/getting-started/integration.html#bundle-optimization
Chart.register(PieController, ArcElement)

export { Chart }
