import type { Configuration } from '../database/models/configuration-entry.model'
import type { Gamemode } from '../shared/types/gamemode'

type StoredConfiguration = Partial<
  Pick<
    Configuration,
    'games.default_player_skill' | 'games.gamemode_whitelist_ids' | 'games.whitelist_id'
  >
>

// The incoming instance's per-gamemode settings, for the gamemodes it brings, where the primary
// has none of its own. The incoming instance's global whitelist was in effect for its gamemodes,
// so it becomes their gamemode whitelist unless the primary's global one is the same.
export function mergeGamemodeConfiguration(
  primary: StoredConfiguration,
  incoming: StoredConfiguration,
  gamemodes: Gamemode[],
): StoredConfiguration {
  const merged: StoredConfiguration = {}

  const incomingSkill = incoming['games.default_player_skill']
  const skill = { ...primary['games.default_player_skill'] }
  for (const gamemode of gamemodes) {
    if (skill[gamemode] === undefined && incomingSkill?.[gamemode] !== undefined) {
      skill[gamemode] = incomingSkill[gamemode]
      merged['games.default_player_skill'] = skill
    }
  }

  const incomingGlobalWhitelist = incoming['games.whitelist_id'] ?? null
  const whitelists = { ...primary['games.gamemode_whitelist_ids'] }
  for (const gamemode of gamemodes) {
    const whitelist =
      incoming['games.gamemode_whitelist_ids']?.[gamemode] ??
      (incomingGlobalWhitelist !== (primary['games.whitelist_id'] ?? null)
        ? incomingGlobalWhitelist
        : null)
    if (whitelists[gamemode] === undefined && whitelist) {
      whitelists[gamemode] = whitelist
      merged['games.gamemode_whitelist_ids'] = whitelists
    }
  }

  return merged
}
