import { Reservation, type ReservationId } from '@tf2pickup-org/serveme-tf-client'
import { client } from './client'

const cache = new Map<ReservationId, Reservation>()

export async function get(id: ReservationId): Promise<Reservation> {
  if (cache.has(id)) {
    return cache.get(id)!
  }

  if (!client) {
    throw new Error(`serveme.tf disabled`)
  }

  const r = await client.fetch(id)
  cache.set(id, r)
  return r
}
