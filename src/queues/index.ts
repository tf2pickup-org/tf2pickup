import { anyRequiresVerification } from './any-requires-verification'
import { bySlug } from './by-slug'
import { bySlugOrDefault } from './by-slug-or-default'
import { create } from './create'
import { disable } from './disable'
import { enable } from './enable'
import { gamemodesInUse } from './gamemodes-in-use'
import { get } from './get'
import { getDefault } from './get-default'
import { list } from './list'
import { listEnabled } from './list-enabled'
import { move } from './move'
import { remove } from './remove'
import { resolveWhitelistId } from './resolve-whitelist-id'
import { update } from './update'

export const queues = {
  anyRequiresVerification,
  bySlug,
  bySlugOrDefault,
  create,
  disable,
  enable,
  gamemodesInUse,
  get,
  getDefault,
  list,
  listEnabled,
  move,
  remove,
  resolveWhitelistId,
  update,
} as const
