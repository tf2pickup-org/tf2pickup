import { getActivityLogs, logsPerPage } from './get-logs'
import { fetchPlayers } from './fetch-players'
import { findPlayersByName } from './find-players-by-name'
import { record } from './record'
import { recordConfigurationChange } from './record-configuration-change'
import { recordMapScramble } from './record-map-scramble'

export const activityLog = {
  getActivityLogs,
  logsPerPage,
  fetchPlayers,
  findPlayersByName,
  record,
  recordConfigurationChange,
  recordMapScramble,
} as const
