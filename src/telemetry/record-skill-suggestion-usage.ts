import { configuration } from '../configuration'
import { collections } from '../database/collections'
import type { PlayerModel, PlayerSkill } from '../database/models/player.model'
import { makeSkillSuggestions } from '../players/make-skill-suggestions'
import { utcDayKey } from './utc-day-key'

interface RecordSkillSuggestionUsageParams {
  player: Pick<PlayerModel, 'elo' | 'stats' | 'skillHistory'>
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
  oldSkill,
  newSkill,
}: RecordSkillSuggestionUsageParams) {
  if (!(await configuration.get('games.skill_suggestions'))) {
    return
  }

  const defaultSkill = await configuration.get('games.default_player_skill')
  const suggestions = makeSkillSuggestions({ player })

  const followed = [...suggestions.entries()].some(([gameClass, direction]) => {
    const before = oldSkill[gameClass] ?? defaultSkill[gameClass] ?? 0
    const after = newSkill[gameClass] ?? defaultSkill[gameClass] ?? 0
    return direction === 'up' ? after > before : after < before
  })

  await collections.telemetryStats.updateOne(
    { day: utcDayKey(new Date()) },
    { $inc: { adminSkillChanges: 1, skillSuggestionsApplied: followed ? 1 : 0 } },
    { upsert: true },
  )
}
