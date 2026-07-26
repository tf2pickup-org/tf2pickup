import { subDays } from 'date-fns'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { GameState } from '../database/models/game.model'
import { utcDayKey } from './utc-day-key'

export async function getUsageCounters() {
  const since = subDays(new Date(), 30)
  const [[totals], [gameTotals]] = await Promise.all([
    collections.telemetryStats
      .aggregate<{ applied: number; changes: number; eloPageRenders: number }>([
        { $match: { day: { $gte: utcDayKey(since) } } },
        {
          $group: {
            _id: null,
            applied: { $sum: '$skillSuggestionsApplied' },
            changes: { $sum: '$adminSkillChanges' },
            eloPageRenders: { $sum: '$eloPageRenders' },
          },
        },
      ])
      .toArray(),
    collections.games
      .aggregate<{
        games: number
        reinitializations: number
        reassignments: number
        forceEnded: number
      }>([
        { $match: { 'events.0.at': { $gte: since } } },
        {
          $project: {
            reinitializations: {
              $size: {
                $filter: {
                  input: '$events',
                  cond: {
                    $eq: ['$$this.event', GameEventType.gameServerReinitializationOrdered],
                  },
                },
              },
            },
            assignments: {
              $size: {
                $filter: {
                  input: '$events',
                  cond: { $eq: ['$$this.event', GameEventType.gameServerAssigned] },
                },
              },
            },
            forceEnded: { $cond: [{ $eq: ['$state', GameState.interrupted] }, 1, 0] },
          },
        },
        {
          $group: {
            _id: null,
            games: { $sum: 1 },
            reinitializations: { $sum: '$reinitializations' },
            reassignments: { $sum: { $max: [{ $subtract: ['$assignments', 1] }, 0] } },
            forceEnded: { $sum: '$forceEnded' },
          },
        },
      ])
      .toArray(),
  ])

  return {
    skillSuggestionsApplied30d: totals?.applied ?? 0,
    adminSkillChanges30d: totals?.changes ?? 0,
    eloPageRenders30d: totals?.eloPageRenders ?? 0,
    games30d: gameTotals?.games ?? 0,
    gameReinitializations30d: gameTotals?.reinitializations ?? 0,
    gameServerReassignments30d: gameTotals?.reassignments ?? 0,
    gamesForceEnded30d: gameTotals?.forceEnded ?? 0,
  }
}
