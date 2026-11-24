import { configuration } from '../configuration'
import { logger } from '../logger'
import { players } from '../players'
import { add } from '../players/restrictions/add'
import { decayCooldownLevel } from '../players/decay-cooldown-level'
import type { SteamId64 } from '../shared/types/steam-id-64'

// Bans the player for the length of their current cooldown level and raises the level. The level
// decays back down while the player stays clean, so the stored one is brought up to date first.
export async function applyEscalatingCooldown(steamId: SteamId64, reason: string) {
  const cooldownLevels = await configuration.get('games.cooldown_levels')
  if (cooldownLevels.length === 0) {
    return
  }
  const decayPeriodMs = await configuration.get('games.cooldown_decay_period')

  const player = await players.bySteamId(steamId, [
    'steamId',
    'cooldownLevel',
    'cooldownLevelUpdatedAt',
  ])
  const now = new Date()
  const { level, decayedLevels } = decayCooldownLevel(player, now, decayPeriodMs)
  const cooldown =
    cooldownLevels.find(({ level: ladderLevel }) => ladderLevel === level) ?? cooldownLevels.at(-1)!

  logger.debug({ steamId, level, decayedLevels, cooldown }, 'applying cooldown')

  await add('ban', {
    player: player.steamId,
    actor: 'bot',
    end: new Date(now.getTime() + cooldown.banLengthMs),
    reason,
  })

  logger.info({ steamId, cooldownLevel: level + 1 }, 'cooldown applied')
  await players.update(player.steamId, {
    $set: {
      cooldownLevel: level + 1,
      cooldownLevelUpdatedAt: now,
    },
  })
}
