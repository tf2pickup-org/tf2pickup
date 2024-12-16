import { subMinutes } from 'date-fns'
import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { Cron } from 'croner'
import { update } from '../update'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    async function removeDeadGameServers() {
      const fiveMinutesAgo = subMinutes(new Date(), 5)
      const dead = await collections.staticGameServers
        .find({ isOnline: true, lastHeartbeatAt: { $lt: fiveMinutesAgo } })
        .toArray()
      for (const server of dead) {
        await update({ id: server.id }, { $set: { isOnline: false } })
      }
    }

    // run every minute
    new Cron('* * * * *', removeDeadGameServers)
  },
  { name: 'remove dead game servers' },
)
