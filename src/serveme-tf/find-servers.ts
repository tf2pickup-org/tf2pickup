import { z } from 'zod'
import { servemeTfApiRequest } from './serveme-tf-api-request'
import { servemeTfServerSchema } from './schemas/serveme-tf-server.schema'
import type { ServemeTfServer } from './types/serveme-tf-server'

const entrySchema = z.object({
  reservation: z.object({
    starts_at: z.string(),
    ends_at: z.string(),
  }),
  actions: z.object({
    find_servers: z.string(),
  }),
})

const findServersSchema = z.object({
  servers: z.array(servemeTfServerSchema),
})

export async function findServers(): Promise<ServemeTfServer[]> {
  const entry = await servemeTfApiRequest(entrySchema, 'reservations/new')
  const { servers } = await servemeTfApiRequest(findServersSchema, entry.actions.find_servers, {
    method: 'POST',
    body: { reservation: entry.reservation },
  })
  return servers
}
