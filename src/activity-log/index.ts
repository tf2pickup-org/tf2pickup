import { fetchLogs, logsPerPage } from './fetch-logs'
import { fetchPlayers } from './fetch-players'
import { record } from './record'
import { recordMapScramble } from './record-map-scramble'

export const activityLog = {
  fetchLogs,
  logsPerPage,
  fetchPlayers,
  record,
  recordMapScramble,
} as const
