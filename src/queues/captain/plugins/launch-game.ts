import fp from 'fastify-plugin'
import { events } from '../../../events'
import { launchGame } from '../../../games/launch-game'
import { logger } from '../../../logger'
import { safe } from '../../../utils/safe'
import { completeLaunch } from '../complete-launch'
import { launchFailed } from '../launch-failed'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const launching = new Set<string>()
    events.on(
      'queue/captain:launching',
      safe(async snapshot => {
        if (snapshot.queue.launchMode !== 'captain' || launching.has(snapshot.token)) return
        launching.add(snapshot.token)
        try {
          await launchGame(snapshot)
        } catch (error) {
          logger.error(
            { error, queue: snapshot.queue._id },
            'failed to launch captain game; returning sign-ups',
          )
          await launchFailed(snapshot.queue._id, snapshot.token)
        } finally {
          launching.delete(snapshot.token)
        }
      }),
    )
    events.on(
      'queue/captainGame:created',
      safe(async ({ game }) => {
        await completeLaunch(game)
      }),
    )
  },
  { name: 'launch captain game' },
)
