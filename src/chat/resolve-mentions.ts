import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'

interface ResolveMentionsResult {
  body: string
  mentions: SteamId64[]
}

// Matches @name or @&quot;name with spaces&quot; (after HTML escaping of quotes)
const mentionPattern = /@&quot;([^&]+)&quot;|@(\w+)/g

export async function resolveMentions(escapedBody: string): Promise<ResolveMentionsResult> {
  const matches = [...escapedBody.matchAll(mentionPattern)]
  if (matches.length === 0) {
    return { body: escapedBody, mentions: [] }
  }

  const mentions: SteamId64[] = []
  let result = escapedBody

  for (const match of matches) {
    const name = match[1] ?? match[2]!
    const player = await collections.players.findOne(
      { name: { $regex: new RegExp(`^${name}$`, 'i') } },
      { projection: { steamId: 1 } },
    )
    if (player) {
      result = result.replace(match[0], `@<${player.steamId}>`)
      if (!mentions.includes(player.steamId)) {
        mentions.push(player.steamId)
      }
    }
  }

  return { body: result, mentions }
}
