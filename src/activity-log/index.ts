import { getActivityLogs, logsPerPage } from './get-logs'
import { getPlayersForActivityLogs } from './get-players-for-logs'
import { getPlayersByNameForActivityLog } from './get-players-by-name'
import { recordActivity } from './record-activity'
import { recordConfigurationChange } from './record-configuration-change'
import { recordMapScramble } from './record-map-scramble'

export const activityLog = {
  getLogs: getActivityLogs,
  logsPerPage,
  getPlayersFor: getPlayersForActivityLogs,
  getPlayersByName: getPlayersByNameForActivityLog,
  record: recordActivity,
  recordConfigurationChange,
  recordMapScramble,
} as const
