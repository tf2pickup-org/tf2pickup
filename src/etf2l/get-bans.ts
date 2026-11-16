import { z } from 'zod'
import { etf2lBanSchema } from './schemas/etf2l-ban.schema'
import { Etf2lApiError } from './errors/etf2l-api.error'
import { environment } from '../environment'
import { logger } from '../logger'

const etf2lBansResponseSchema = z.object({
  bans: z.object({
    data: z.array(z.unknown()),
  }),
})

export async function getBans(page: number) {
  const url = `${environment.ETF2L_API_ENDPOINT}/bans?page=${page}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Etf2lApiError(url, response, `${response.status} ${response.statusText}`)
  }

  const data = await etf2lBansResponseSchema.parseAsync(await response.json())
  return data.bans.data.flatMap(row => {
    const ban = etf2lBanSchema.safeParse(row)
    if (!ban.success) {
      logger.debug({ row, error: ban.error }, 'skipping invalid ETF2L.org ban row')
      return []
    }
    return [ban.data]
  })
}
