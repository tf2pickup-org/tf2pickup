import { minutesToMilliseconds } from 'date-fns'
import fp from 'fastify-plugin'
import { safe } from '../../utils/safe'
import { syncAvatars } from '../sync-avatars'

// One batch (up to 100 players) every 5 minutes keeps Steam API usage low while
// still refreshing tens of thousands of avatars per day.
const syncInterval = minutesToMilliseconds(5)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', () => {
      setInterval(safe(syncAvatars), syncInterval)
    })
  },
  { name: 'auto resync avatars' },
)
