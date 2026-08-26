import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { recordGameOutcome } from '../record-game-outcome'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        await recordGameOutcome(game)
      }),
    )
  },
  {
    name: 'record game outcome',
  },
)
