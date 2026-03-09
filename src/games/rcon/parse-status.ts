import SteamID from 'steamid'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface StatusPlayer {
  name: string
  steamId: SteamId64
}

export function parseStatus(statusOutput: string): StatusPlayer[] {
  const players: StatusPlayer[] = []
  const playerLineRegex = /^#\s*\d+\s+"(.+?)"\s+(\[U:\d+:\d+\])/gm

  let match: RegExpExecArray | null
  while ((match = playerLineRegex.exec(statusOutput)) !== null) {
    const [, name, steamId3] = match

    if (!name || !steamId3) {
      continue
    }

    try {
      const steamId = new SteamID(steamId3)
      if (steamId.isValid()) {
        players.push({
          name,
          steamId: steamId.getSteamID64() as SteamId64,
        })
      }
    } catch {
      // Skip invalid steam IDs
      continue
    }
  }

  return players
}
