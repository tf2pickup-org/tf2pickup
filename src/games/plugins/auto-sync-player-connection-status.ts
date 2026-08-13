import { secondsToMilliseconds } from 'date-fns'
import fp from 'fastify-plugin'
import { logError } from '../../utils/log-error'
import { syncPlayerConnectionStatus } from '../sync-player-connection-status'

// Reconcile slot connection status against the gameserver's `status` command on a
// steady cadence, so a dropped UDP log line can't leave a present player marked
// offline (and wrongly substituted).
const syncInterval = secondsToMilliseconds(30)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', () => {
      // Chain runs instead of using setInterval so a slow pass (many games, each
      // a sequential rcon round-trip) can't overlap with the next and double-emit.
      function scheduleNext() {
        setTimeout(() => void run(), syncInterval).unref()
      }
      async function run() {
        try {
          await syncPlayerConnectionStatus()
        } catch (error) {
          logError(error)
        } finally {
          scheduleNext()
        }
      }
      void run()
    })
  },
  { name: 'auto sync player connection status' },
)
