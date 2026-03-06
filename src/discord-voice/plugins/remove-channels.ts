import fp from 'fastify-plugin'
import { minutesToMilliseconds } from 'date-fns'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { tasks } from '../../tasks'
import { games } from '../../games'
import { getConfig } from '../get-config'
import { removeGameChannels } from '../remove-game-channels'

const removeChannelDelay = minutesToMilliseconds(1)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('discord.cleanupVoiceChannels', async ({ gameNumber }) => {
      const game = await games.findOne({ number: gameNumber })
      const { removed } = await removeGameChannels(game)
      if (!removed) {
        await tasks.schedule('discord.cleanupVoiceChannels', removeChannelDelay, { gameNumber })
      }
    })

    events.on(
      'game:ended',
      safe(async ({ game }) => {
        const config = await getConfig()
        if (!config) {
          return
        }

        await tasks.schedule('discord.cleanupVoiceChannels', removeChannelDelay, {
          gameNumber: game.number,
        })
      }),
    )
  },
  { name: 'discord voice - auto remove old channels' },
)
