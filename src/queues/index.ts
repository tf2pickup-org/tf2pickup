import { anyRequiresVerification } from './any-requires-verification'
import { byPageUrl } from './by-page-url'
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
import { pageUrls } from './page-urls'
import { queuePageUrl } from './queue-page-url'
import { remove } from './remove'
import { resolveWhitelistId } from './resolve-whitelist-id'
import { update } from './update'

export const queues = {
  anyRequiresVerification,
  byPageUrl,
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
  pageUrls,
  queuePageUrl,
  remove,
  resolveWhitelistId,
  update,
} as const
