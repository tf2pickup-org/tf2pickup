import type { Filter } from 'mongodb'
import { collections } from '../../database/collections'
import type { PlayerActionEntryModel } from '../../database/models/player-action-entry.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { escapeRegex } from '../../utils/escape-regex'

interface GetLogsParams {
  page: number
  sortOrder: 'asc' | 'desc'
  actionFilter?: string
  playerSteamIds?: SteamId64[]
  ipAddress?: string
}

interface GetLogsResult {
  logs: PlayerActionEntryModel[]
  totalCount: number
}

export const logsPerPage = 20

export async function getLogs(params: GetLogsParams): Promise<GetLogsResult> {
  const conditions: Filter<PlayerActionEntryModel>[] = []

  if (params.actionFilter) {
    conditions.push({ action: { $regex: `^${escapeRegex(params.actionFilter)}` } })
  }

  if (params.playerSteamIds && params.playerSteamIds.length > 0) {
    conditions.push({ player: { $in: params.playerSteamIds } })
  }

  if (params.ipAddress) {
    conditions.push({ ipAddress: params.ipAddress })
  }

  const filter: Filter<PlayerActionEntryModel> =
    conditions.length > 1 ? { $and: conditions } : conditions.length === 1 ? conditions[0]! : {}

  const skip = (params.page - 1) * logsPerPage

  const [logs, totalCount] = await Promise.all([
    collections.playerActions
      .find(filter, {
        sort: { timestamp: params.sortOrder === 'asc' ? 1 : -1 },
        skip,
        limit: logsPerPage,
      })
      .toArray(),
    collections.playerActions.countDocuments(filter),
  ])

  return { logs, totalCount }
}
