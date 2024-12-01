import { configuration } from '../configuration'
import { collections } from '../database/collections'
import type { GameModel } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function mumbleDirectUrl(game: GameModel, player: SteamId64): Promise<URL> {
  const p = await collections.players.findOne({ steamId: player })
  if (p === null) {
    throw new Error(`player not found: ${p}`)
  }

  const slot = game.slots.find(s => s.player === player)
  if (!slot) {
    throw new Error(`player is not in the game`)
  }

  const [host, port, rootChannelName, password] = await Promise.all([
    configuration.get('games.voice_server.mumble.url'),
    configuration.get('games.voice_server.mumble.port'),
    configuration.get('games.voice_server.mumble.channel_name'),
    configuration.get('games.voice_server.mumble.password'),
  ])

  const url = new URL(`mumble://${host}`)
  url.pathname = [rootChannelName, String(game.number), slot.team.toUpperCase()].join('/')
  url.username = p.name.replace(/\s+/g, '_')
  if (password) {
    url.password = password
  }
  url.protocol = 'mumble:'
  url.port = `${port}`
  return url
}
