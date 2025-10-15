import { assign } from './assign'
import { client } from './client'
import { listRegions } from './list-regions'
import { waitForStart } from './wait-for-start'

export const servemeTf = {
  assign,
  isEnabled: client !== null,
  listRegions,
  waitForStart,

  client,
} as const
