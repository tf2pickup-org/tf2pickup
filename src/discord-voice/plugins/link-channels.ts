import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { createPostgameLobby } from '../create-postgame-lobby'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        await createPostgameLobby(game)
      }),
    )
  },
  { name: 'discord voice - create postgame lobby' },
)
