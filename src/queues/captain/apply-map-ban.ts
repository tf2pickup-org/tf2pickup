import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import { logger } from '../../logger'
import { banTurn } from './ban-turn'
import { captainDraftMetrics } from './metrics'

export function applyMapBan(draft: CaptainDraftModel, map: string, how: 'chosen' | 'timedOut') {
  const { team } = banTurn(draft)
  draft.bans.push({ team, map, at: new Date(), how })
  captainDraftMetrics.decisions.add(1, {
    phase: 'ban',
    how: how === 'timedOut' ? 'timed_out' : how,
  })
  logger.info({ queue: draft.queue, team, map, how }, 'captain draft map banned')
}
