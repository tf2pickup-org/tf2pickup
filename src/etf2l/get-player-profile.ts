import { z } from 'zod'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { etf2lProfileSchema } from './schemas/etf2l-profile.schema'
import type { Etf2lProfile } from './types/etf2l-profile'
import { Etf2lApiError } from './errors/etf2l-api.error'

const etf2lApiEndpoint = 'http://api-v2.etf2l.org'

const etf2lPlayerResponseSchema = z.object({
  player: etf2lProfileSchema,
  status: z.object({
    code: z.literal(200),
    message: z.literal('OK'),
  }),
})

export async function getPlayerProfile(steamId: SteamId64): Promise<Etf2lProfile> {
  const url = `${etf2lApiEndpoint}/player/${steamId}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Etf2lApiError(url, response, `${response.status} ${response.statusText}`)
  }

  const data = await etf2lPlayerResponseSchema.parseAsync(await response.json())
  return data.player
}
