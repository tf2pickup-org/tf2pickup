import fp from 'fastify-plugin'
import { events } from '../../events'
import { GamesLink } from '../../html/components/games-link'
import { ServerReadyNotification } from '../views/html/server-ready-notification'
import { gamePage } from '../page'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  events.on('game:updated', ({ before, after }) => {
    gamePage.sync(app.gateway, before, after)

    if (after.connectString !== undefined && before.connectString !== after.connectString) {
      app.gateway
        .to({ players: after.slots.map(({ player }) => player) })
        .send(async actor => await ServerReadyNotification(actor!))
    }
  })

  async function refreshGamesLink() {
    const cmp = await GamesLink()
    app.gateway.broadcast(() => cmp)
  }
  events.on('game:created', refreshGamesLink)
  events.on('game:ended', refreshGamesLink)
})
