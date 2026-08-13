import { secondsToMilliseconds } from 'date-fns'
import fp from 'fastify-plugin'
import { safe } from '../../utils/safe'
import { syncPlayerConnectionStatus } from '../sync-player-connection-status'

// Reconcile slot connection status against the gameserver's `status` command on a
// steady cadence, so a dropped UDP log line can't leave a present player marked
// offline (and wrongly substituted).
const syncInterval = secondsToMilliseconds(30)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', async () => {
      setInterval(safe(syncPlayerConnectionStatus), syncInterval).unref()
      await syncPlayerConnectionStatus()
    })
  },
  { name: 'auto sync player connection status' },
)
