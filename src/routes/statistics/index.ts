import { StatisticsPage } from '../../statistics/views/html/statistics.page'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (req, reply) => {
    reply.status(200).html(await StatisticsPage(req.user))
  })
})
