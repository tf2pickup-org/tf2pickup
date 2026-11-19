import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import { logger } from '../../logger'
import { captainDraftMetrics } from './metrics'
import type { DraftPick } from './types/draft-pick'

// Applies a pick to the draft held in memory; captainMachine.advanceDraft() persists it.
export function applyPick(
  draft: CaptainDraftModel,
  pick: DraftPick,
  how: CaptainDraftModel['picks'][number]['how'],
) {
  draft.picks.push({ ...pick, at: new Date(), how })
  captainDraftMetrics.decisions.add(1, {
    phase: 'pick',
    how: how === 'timedOut' ? 'timed_out' : how,
  })
  logger.info(
    { queue: draft.queue, team: pick.team, steamId: pick.player, role: pick.role, how },
    'captain draft pick',
  )
}
