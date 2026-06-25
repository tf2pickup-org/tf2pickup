import { environment } from '../environment'
import { assign } from './assign'
import { findServers } from './find-servers'
import { listRegions } from './list-regions'
import { waitForStart } from './wait-for-start'

export const servemeTf = {
  isEnabled: environment.SERVEME_TF_API_KEY !== undefined,
  assign,
  findServers,
  listRegions,
  waitForStart,
} as const
