import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { hideIpAddresses } from '../../utils/hide-ip-addresses'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', async ({ message }) => {
      const logLine = hideIpAddresses(message.payload)
      await collections.gameLogs.findOneAndUpdate(
        { logSecret: message.password },
        { $push: { logs: logLine } },
        { upsert: true },
      )
    })
  },
  { name: 'game log collector', encapsulate: true },
)
