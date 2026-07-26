import { collections } from '../database/collections'
import { GameEndedReason, GameEventType } from '../database/models/game-event.model'
import { GameState } from '../database/models/game.model'
import type { ActivityLogEntryModel } from '../database/models/activity-log-entry.model'
import { logger } from '../logger'

export async function up() {
  const entries: ActivityLogEntryModel[] = []

  // === Player name changes from nameHistory ===
  const players = await collections.players
    .find({}, { projection: { steamId: 1, name: 1, nameHistory: 1, skillHistory: 1 } })
    .toArray()

  for (const player of players) {
    if (player.nameHistory && player.nameHistory.length > 0) {
      const sorted = [...player.nameHistory].sort(
        (a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
      )
      for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i]
        if (!entry) continue
        entries.push({
          type: 'player name change',
          timestamp: entry.changedAt,
          player: player.steamId,
          oldName: entry.name,
          newName: sorted[i + 1]?.name ?? player.name,
        })
      }
    }

    // === Player skill changes from skillHistory ===
    if (player.skillHistory && player.skillHistory.length > 0) {
      const sorted = [...player.skillHistory].sort((a, b) => a.at.getTime() - b.at.getTime())
      for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i]
        if (!entry) continue
        const oldSkill = sorted[i - 1]?.skill ?? {}
        entries.push({
          type: 'player skill change',
          timestamp: entry.at,
          player: player.steamId,
          oldSkill,
          newSkill: entry.skill,
          actor: entry.actor,
        })
      }
    }
  }

  // === Game events ===
  const gamesCursor = collections.games
    .find(
      {
        state: { $in: [GameState.ended, GameState.interrupted] },
        events: { $exists: true },
      },
      { projection: { number: 1, events: 1 } },
    )
    .sort({ 'events.0.at': 1 })

  for await (const game of gamesCursor) {
    for (const event of game.events) {
      switch (event.event) {
        case GameEventType.gameEnded:
          if (event.reason !== GameEndedReason.matchEnded) {
            entries.push({
              type: 'game force-ended',
              timestamp: event.at,
              gameNumber: game.number,
              ...(event.actor && { actor: event.actor }),
            })
          }
          break

        case GameEventType.gameServerAssigned:
          if (event.actor && event.actor !== 'bot') {
            entries.push({
              type: 'game server reassigned',
              timestamp: event.at,
              gameNumber: game.number,
              gameServer: event.gameServerName,
              actor: event.actor,
            })
          }
          break

        case GameEventType.gameServerReinitializationOrdered:
          entries.push({
            type: 'game reconfigured',
            timestamp: event.at,
            gameNumber: game.number,
            ...(event.actor && { actor: event.actor }),
          })
          break

        case GameEventType.substituteRequested:
          entries.push({
            type: 'substitute requested',
            timestamp: event.at,
            gameNumber: game.number,
            player: event.player,
            actor: event.actor,
            gameClass: event.gameClass,
            ...(event.reason && { reason: event.reason }),
          })
          break
      }
    }
  }

  if (entries.length === 0) {
    logger.info('no activity log entries to backfill')
    return
  }

  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  await collections.activityLog.insertMany(entries)
  logger.info(`backfilled ${entries.length} activity log entries`)
}
