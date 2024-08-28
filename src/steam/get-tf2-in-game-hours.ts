import { z } from 'zod'
import { environment } from '../environment'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { SteamApiError } from './errors/steam-api.error'
import { secondsToHours } from 'date-fns'

const userStatsForGameResponseSchema = z.object({
  playerstats: z.object({
    steamID: z.string(),
    gameName: z.literal('Team Fortress 2'),
    stats: z
      .array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      )
      .optional(),
    achievements: z
      .array(
        z.object({
          name: z.string(),
          achieved: z.literal(1),
        }),
      )
      .optional(),
  }),
})

export async function getTf2InGameHours(steamId64: SteamId64): Promise<number> {
  const url = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002?appid=440&key=${environment.STEAM_API_KEY}&steamid=${steamId64}&format=json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new SteamApiError(response.status, response.statusText)
  }

  const data = await userStatsForGameResponseSchema.parseAsync(await response.json())
  if (data.playerstats.stats) {
    return secondsToHours(
      data.playerstats.stats
        .filter(s => s.name.endsWith('.accum.iPlayTime'))
        .reduce((sum, curr) => sum + curr.value, 0),
    )
  } else {
    return 0
  }
}
