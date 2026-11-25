import fp from 'fastify-plugin'
import { safe } from '../../utils/safe'
import { reconcileActiveGames } from '../reconcile-active-games'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', safe(reconcileActiveGames))
  },
  { name: 'reconcile active games' },
)
