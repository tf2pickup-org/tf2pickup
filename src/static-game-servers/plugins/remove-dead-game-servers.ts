import { minutesToMilliseconds, subMinutes } from 'date-fns'
import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { safe } from '../../utils/safe'
import { update } from '../update'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function removeDeadGameServers() {
      const fiveMinutesAgo = subMinutes(new Date(), 5)
      const dead = await collections.staticGameServers
        .find({ isOnline: true, lastHeartbeatAt: { $lt: fiveMinutesAgo } })
        .toArray()
      for (const server of dead) {
        await update({ id: server.id }, { $set: { isOnline: false } })
      }
    }

    app.addHook('onReady', () => {
      setInterval(safe(removeDeadGameServers), minutesToMilliseconds(1))
    })
  },
  { name: 'remove dead game servers' },
)
