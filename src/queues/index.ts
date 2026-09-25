import { anyRequiresVerification } from './any-requires-verification'
import { get } from './get'
import { getDefault } from './get-default'
import { listEnabled } from './list-enabled'
import { resolveWhitelistId } from './resolve-whitelist-id'
import { update } from './update'

export const queues = {
  anyRequiresVerification,
  get,
  getDefault,
  listEnabled,
  resolveWhitelistId,
  update,
} as const
