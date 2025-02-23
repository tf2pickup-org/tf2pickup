import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { tasks } from '../../tasks'
import { moveToTargetChannel } from '../move-to-target-channel'
import { assertClientIsConnected } from '../assert-client-is-connected'
import { client } from '../client'
import { logger } from '../../logger'
import { minutesToMilliseconds } from 'date-fns'

const removeChannelDelay = minutesToMilliseconds(1)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('mumble.cleanupChannel', async ({ gameNumber }) => {
      await moveToTargetChannel()
      assertClientIsConnected(client)

      const channel = client.user.channel.subChannels.find(({ name }) => name === `${gameNumber}`)
      if (!channel) {
        logger.debug({ gameNumber }, 'mumble channel already removed')
        return
      }

      const userCount =
        channel.subChannels.map(c => c.users.length).reduce((prev, curr) => prev + curr, 0) +
        channel.users.length

      if (userCount > 0) {
        logger.debug({ gameNumber, userCount }, `mumble channel not empty yet; not removing`)
        await tasks.schedule('mumble.cleanupChannel', removeChannelDelay, { gameNumber })
        return
      }

      await channel.remove()
      logger.info({ gameNumber }, 'mumble channel removed')
    })

    events.on(
      'game:ended',
      safe(async ({ game }) => {
        await tasks.schedule('mumble.cleanupChannel', removeChannelDelay, {
          gameNumber: game.number,
        })
      }),
    )
  },
  {
    name: 'auto remove old channels',
  },
)
