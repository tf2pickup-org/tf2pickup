import { findFree } from './find-free'
import { heartbeat } from './heartbeat'
import { assign } from './assign'
import { update } from './update'

export const staticGameServers = {
  assign,
  findFree,
  heartbeat,
  update,
} as const
