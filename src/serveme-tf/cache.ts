import { Reservation, type ReservationId } from '@tf2pickup-org/serveme-tf-client'
import { getClient } from './client'
import { errors } from '../errors'

const cache = new Map<ReservationId, Reservation>()

export async function get(id: ReservationId): Promise<Reservation> {
  if (cache.has(id)) {
    return cache.get(id)!
  }

  const client = await getClient()
  if (!client) {
    throw errors.badRequest(`serveme.tf is disabled`)
  }

  const r = await client.fetch(id)
  cache.set(id, r)
  return r
}
