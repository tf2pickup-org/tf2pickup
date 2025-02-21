import fp from 'fastify-plugin'
import { tasks } from '../../tasks'
import { client } from '../client'
import type { ReservationId } from '@tf2pickup-org/serveme-tf-client'
import { events } from '../../events'
import { GameServerProvider } from '../../database/models/game.model'
import { secondsToMilliseconds } from 'date-fns'
import { logger } from '../../logger'

const endReservationDelay = secondsToMilliseconds(30)

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  async function endReservation(id: ReservationId) {
    if (!client) {
      throw new Error(`serveme.tf disabled`)
    }

    const reservation = await client.fetch(id)
    await reservation.end()
    logger.debug({ reservationId: reservation.id }, `reservation ended`)
  }

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
