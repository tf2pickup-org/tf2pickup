import { assign } from './assign'
import { getClient, isEnabled } from './client'
import { listRegions } from './list-regions'
import { waitForStart } from './wait-for-start'

export const servemeTf = {
  assign,
  isEnabled,
  listRegions,
  waitForStart,

  getClient,
} as const
