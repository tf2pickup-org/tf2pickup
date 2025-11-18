import fp from 'fastify-plugin'
import { events } from '../../events'
import { configuration } from '../../configuration'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  events.on('player:created', async ({ steamId }) => {
    const config = await configuration.get('players.bypass_registration_restrictions')
    await configuration.set(
      'players.bypass_registration_restrictions',
      config.filter(c => c !== steamId),
    )
  })
})
