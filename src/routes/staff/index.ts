import { StaffPage } from '../../players/views/html/staff.page'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_request, reply) => {
    await reply.status(200).html(StaffPage())
  })
})
