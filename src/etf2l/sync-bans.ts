import { getUnixTime, subMonths } from 'date-fns'
import type { z } from 'zod'
import { collections } from '../database/collections'
import { configuration } from '../configuration'
import { logger } from '../logger'
import { tasks } from '../tasks'
import { getBans } from './get-bans'
import type { etf2lBanSchema } from './schemas/etf2l-ban.schema'

const maxPages = 50

// ponytail: in-memory watermark, a restart re-scans the last month; per-player syncs are idempotent
let watermark = getUnixTime(subMonths(new Date(), 1))

export async function syncBans() {
  if (!(await configuration.get('players.etf2l_ban_sync'))) {
    return
  }

  const since = watermark
  const rows: z.infer<typeof etf2lBanSchema>[] = []
  for (let page = 1; page <= maxPages; ++page) {
    let bans: z.infer<typeof etf2lBanSchema>[]
    try {
      bans = await getBans(page)
    } catch (error) {
      logger.warn({ error, page }, 'failed to fetch ETF2L.org bans')
      break
    }

    const newer = bans.filter(ban => ban.start > since)
    rows.push(...newer)
    if (bans.length === 0 || newer.length < bans.length) {
      break
    }
  }

  if (rows.length === 0) {
    return
  }

  const steamIds = Array.from(new Set(rows.map(row => row.steamid64)))
  const players = await collections.players
    .find({ steamId: { $in: steamIds } }, { projection: { steamId: 1 } })
    .toArray()
  for (const { steamId } of players) {
    await tasks.schedule('etf2l:syncPlayerProfile', 0, { player: steamId })
  }

  watermark = Math.max(...rows.map(row => row.start))
}
