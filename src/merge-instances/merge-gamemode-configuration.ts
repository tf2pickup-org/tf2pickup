import type { Configuration } from '../database/models/configuration-entry.model'
import type { Gamemode } from '../shared/types/gamemode'

type StoredConfiguration = Partial<Pick<Configuration, 'games.default_player_skill'>>

// The incoming instance's per-gamemode settings, for the gamemodes it brings, where the primary
// has none of its own.
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

  return merged
}
