import fp from 'fastify-plugin'
import { PlayerConnectionStatus } from '../../database/models/game-slot.model'
import { events } from '../../events'
import { tasks } from '../../tasks'
import { safe } from '../../utils/safe'
import { gameVoice } from '../game-voice'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('mumble.cleanupChannel', async ({ gameNumber }) => {
      await gameVoice.remove(gameNumber)
    })

    events.on(
      'game:created',
      safe(async ({ game }) => {
        await gameVoice.open(game)
      }),
    )

    events.on(
      'game:playerReplaced',
      safe(async params => {
        await gameVoice.replace(params)
      }),
    )

    events.on(
      'game:updated',
      safe(async ({ before, after }) => {
        await gameVoice.sync(after, before)
      }),
    )

    events.on(
      'game:playerConnectionStatusUpdated',
      safe(async ({ game, playerConnectionStatus }) => {
        if (playerConnectionStatus === PlayerConnectionStatus.connected) {
          await gameVoice.settle(game.number)
        }
      }),
    )

    events.on(
      'mumble/userMoved',
      safe(async ({ user }) => {
        if (user.hash) {
          await gameVoice.settleFor(user.hash)
        }
      }),
    )

    events.on(
      'game:ended',
      safe(async ({ game }) => {
        await gameVoice.close(game)
      }),
    )
  },
  { name: 'mumble game voice' },
)
