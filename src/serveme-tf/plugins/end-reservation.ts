import fp from 'fastify-plugin'
import { tasks } from '../../tasks'
import { endReservation } from '../end-reservation'
import type { ReservationId } from '../types/reservation-id'
import { events } from '../../events'
import { GameServerProvider } from '../../database/models/game.model'
import { secondsToMilliseconds } from 'date-fns'

const endReservationDelay = secondsToMilliseconds(30)

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  tasks.register('servemeTf:endReservation', async ({ id }) => {
    await endReservation(id as ReservationId)
  })

  events.on('game:ended', async ({ game }) => {
    if (game.gameServer?.provider !== GameServerProvider.servemeTf) {
      return
    }

    const id = Number(game.gameServer.id)
    await tasks.schedule('servemeTf:endReservation', endReservationDelay, { id })
  })
})
