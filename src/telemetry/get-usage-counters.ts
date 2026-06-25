import { subDays } from 'date-fns'
import { collections } from '../database/collections'
import { utcDayKey } from './utc-day-key'

/** Skill-suggestion usage accumulated over the trailing 30 days. */
export async function getUsageCounters() {
  const since = utcDayKey(subDays(new Date(), 30))
  const [totals] = await collections.telemetryStats
    .aggregate<{ applied: number; changes: number }>([
      { $match: { day: { $gte: since } } },
      {
        $group: {
          _id: null,
          applied: { $sum: '$skillSuggestionsApplied' },
          changes: { $sum: '$adminSkillChanges' },
        },
      },
    ])
    .toArray()

  return {
    skillSuggestionsApplied30d: totals?.applied ?? 0,
    adminSkillChanges30d: totals?.changes ?? 0,
  }
}
