import type { Filter, WithId } from 'mongodb'
import { collections } from '../database/collections'
import type {
  ActivityLogEntryModel,
  ActivityLogEntryType,
} from '../database/models/activity-log-entry.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

interface GetActivityLogsParams {
  page: number
  sortOrder: 'asc' | 'desc'
  typeFilter?: ActivityLogEntryType
  playerSteamIds?: SteamId64[]
  actorSteamIds?: SteamId64[]
}

interface GetActivityLogsResult {
  logs: WithId<ActivityLogEntryModel>[]
  totalCount: number
}

export const logsPerPage = 20

export async function fetchLogs(params: GetActivityLogsParams): Promise<GetActivityLogsResult> {
  const conditions: Filter<ActivityLogEntryModel>[] = []

  if (params.typeFilter) {
    conditions.push({ type: params.typeFilter })
  }

  if (params.playerSteamIds && params.playerSteamIds.length > 0) {
    conditions.push({
      player: { $in: params.playerSteamIds },
    } satisfies Filter<ActivityLogEntryModel>)
  }

  if (params.actorSteamIds && params.actorSteamIds.length > 0) {
    conditions.push({
      $or: [{ actor: { $in: params.actorSteamIds } }, { admin: { $in: params.actorSteamIds } }],
    } satisfies Filter<ActivityLogEntryModel>)
  }

  const filter: Filter<ActivityLogEntryModel> =
    conditions.length > 1 ? { $and: conditions } : conditions.length === 1 ? conditions[0]! : {}

  const skip = (params.page - 1) * logsPerPage

  const [logs, totalCount] = await Promise.all([
    collections.activityLog
      .find(filter, {
        sort: { timestamp: params.sortOrder === 'asc' ? 1 : -1 },
        skip,
        limit: logsPerPage,
      })
      .toArray(),
    collections.activityLog.countDocuments(filter),
  ])

  return { logs, totalCount }
}
