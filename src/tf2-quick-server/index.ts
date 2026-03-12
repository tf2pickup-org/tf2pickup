import { assign } from './assign'
import { listFree } from './list-free'
import { toGameServer } from './to-game-server'
import { waitForReady } from './wait-for-ready'
import { environment } from '../environment'

export const tf2QuickServer = {
  assign,
  listFree,
  toGameServer,
  waitForReady,
  isEnabled:
    Boolean(environment.TF2_QUICK_SERVER_CLIENT_ID) &&
    Boolean(environment.TF2_QUICK_SERVER_CLIENT_SECRET),
} as const
