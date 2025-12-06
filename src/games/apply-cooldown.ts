import { configuration } from '../configuration'
import { logger } from '../logger'
import { players } from '../players'
import { addBan } from '../players/add-ban'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function applyCooldown(steamId: SteamId64) {
  logger.trace({ steamId }, 'players.applyCooldown()')

  const cooldownLevels = await configuration.get('games.cooldown_levels')
  if (cooldownLevels.length === 0) {
    return
  }

  const player = await players.bySteamId(steamId, ['steamId', 'cooldownLevel'])
  const cooldown =
    cooldownLevels.find(({ level }) => level === player.cooldownLevel) ?? cooldownLevels.at(-1)!

  logger.debug({ steamId, cooldown }, 'applying cooldown')

  await addBan({
    player: player.steamId,
    admin: 'bot',
    end: new Date(Date.now() + cooldown.banLengthMs),
    reason: `Cooldown level ${player.cooldownLevel}`,
  })

  logger.info({ player }, 'cooldown applied')
  await players.update(player.steamId, {
    $inc: {
      cooldownLevel: 1,
    },
  })
}
