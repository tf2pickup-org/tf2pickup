import { anyRequiresVerification } from './any-requires-verification'
import { byPageUrl } from './page/by-page-url'
import { bySlug } from './by-slug'
import { bySlugOrDefault } from './by-slug-or-default'
import { create } from './create'
import { disable } from './disable'
import { enable } from './enable'
import { gamemodesInUse } from './gamemodes-in-use'
import { get } from './get'
import { getDefault } from './get-default'
import { kick } from './kick'
import { list } from './list'
import { listEnabled } from './list-enabled'
import { membership } from './membership'
import { pageUrls } from './page/page-urls'
import { playerCounts } from './player-counts'
import { queuePageUrl } from './page/queue-page-url'
import { remove } from './remove'
import { reorder } from './reorder'
import { removePlayer } from './remove-player'
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
  kick,
  list,
  listEnabled,
  membership,
  pageUrls,
  playerCounts,
  queuePageUrl,
  remove,
  reorder,
  removePlayer,
  resolveWhitelistId,
  update,
} as const
