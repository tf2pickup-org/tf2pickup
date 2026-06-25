import { z } from 'zod'
import { add } from 'date-fns'
import { generate } from 'generate-password'
import { servemeTfApiRequest } from './serveme-tf-api-request'
import { servemeTfReservationSchema } from './schemas/serveme-tf-reservation.schema'
import type { ServemeTfReservation } from './types/serveme-tf-reservation'
import type { ServerId } from './types/server-id'

interface CreateReservationOptions {
  serverId: ServerId
  enablePlugins?: boolean
  enableDemosTf?: boolean
  firstMap?: string
}

const responseSchema = z.object({
  reservation: servemeTfReservationSchema,
})

const generatePassword = () => generate({ length: 10, numbers: true, uppercase: true })

export async function createReservation(
  options: CreateReservationOptions,
): Promise<ServemeTfReservation> {
  const startsAt = new Date()
  const endsAt = add(startsAt, { hours: 2 })

  const { reservation } = await servemeTfApiRequest(responseSchema, 'reservations', {
    method: 'POST',
    body: {
      reservation: {
        server_id: options.serverId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        rcon: generatePassword(),
        password: generatePassword(),
        ...(options.enablePlugins && { enable_plugins: options.enablePlugins }),
        ...(options.enableDemosTf && { enable_demos_tf: options.enableDemosTf }),
        ...(options.firstMap && { first_map: options.firstMap }),
      },
    },
  })
  return reservation
}
