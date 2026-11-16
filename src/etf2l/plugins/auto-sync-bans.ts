import { hoursToMilliseconds } from 'date-fns'
import fp from 'fastify-plugin'
import { safe } from '../../utils/safe'
import { syncBans } from '../sync-bans'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', () => {
      setInterval(safe(syncBans), hoursToMilliseconds(24))
    })
  },
  { name: 'auto sync etf2l bans' },
)
