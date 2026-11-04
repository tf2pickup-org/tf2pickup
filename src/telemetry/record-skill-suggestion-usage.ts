import { configuration } from '../configuration'
import { collections } from '../database/collections'
import type { PlayerModel, PlayerSkill } from '../database/models/player.model'
import type { Gamemode } from '../shared/types/gamemode'
import { makeSkillSuggestions } from '../players/make-skill-suggestions'
import { effectiveSkill } from '../players/effective-skill'
import { utcDayKey } from './utc-day-key'

interface RecordSkillSuggestionUsageParams {
  player: Pick<PlayerModel, 'elo' | 'stats' | 'skillHistory'>
  gamemode: Gamemode
  oldSkill: PlayerSkill
  newSkill: PlayerSkill
}

/**
 * Records an admin skill save for telemetry: counts every save, and counts it
 * as a "suggestion applied" when at least one class was moved in the direction
 * the skill suggestion recommended. Only counts while the feature is enabled —
 * if suggestions are off the admin can't have acted on one.
 */
export async function recordSkillSuggestionUsage({
  player,
  gamemode,
  oldSkill,
  newSkill,
}: RecordSkillSuggestionUsageParams) {
  if (!(await configuration.get('games.skill_suggestions'))) {
    return
  }

  const defaultSkill = (await configuration.get('games.default_player_skill'))[gamemode]
  const suggestions = makeSkillSuggestions({ player, gamemode })

  const followed = [...suggestions.entries()].some(([gameClass, direction]) => {
    const before = effectiveSkill(oldSkill, defaultSkill, gameClass)
    const after = effectiveSkill(newSkill, defaultSkill, gameClass)
    return direction === 'up' ? after > before : after < before
  })

  await collections.telemetryStats.updateOne(
    { day: utcDayKey(new Date()) },
    { $inc: { adminSkillChanges: 1, skillSuggestionsApplied: followed ? 1 : 0 } },
    { upsert: true },
  )
}
