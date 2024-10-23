import { subMinutes } from 'date-fns'
import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { Cron } from 'croner'

async function removeDeadGameServers() {
  const fiveMinutesAgo = subMinutes(new Date(), 5)
  await collections.staticGameServers.updateMany(
    {
      isOnline: true,
      lastHeartbeatAt: { $lt: fiveMinutesAgo },
    },
    {
      $set: {
        isOnline: false,
      },
    },
  )
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    // run every minute
    new Cron('* * * * *', removeDeadGameServers)
  },
  { name: 'remove dead game servers' },
)
