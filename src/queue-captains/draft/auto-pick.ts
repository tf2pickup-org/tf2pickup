import { collections } from '../../database/collections'
import type { DraftModel } from '../../database/models/draft.model'
import { logger } from '../../logger'
import { config } from '../../queue-auto/config'
import { withQueueLock } from '../../queue/with-queue-lock'
import { legalPicks } from '../matching/legal-picks'
import { currentTurn } from './current-turn'
import { getCurrent } from './get-current'
import { openSlots } from './open-slots'
import { remainingCandidates } from './remaining-candidates'
import { resolveTurns } from './resolve-turns'

/**
 * The captain ran out of time, so a pick is made for them: the longest-waiting player still
 * available, on the first class of theirs that is legal.
 *
 * Deterministic rather than random, so a draft replays exactly from its log, and it rewards
 * patience in the queue instead of rolling dice on someone's night.
 */
export async function autoPick(draftId: string, turn: number): Promise<DraftModel | null> {
  return await withQueueLock('captains:auto-pick', async () => {
    const draft = await getCurrent()
    if (draft?.id !== draftId) {
      return null
    }

    // the captain got there first; this timeout belongs to a turn that is already settled
    if (draft.picks.length !== turn) {
      return null
    }

    const current = currentTurn(draft, config)
    if (current === null) {
      return null
    }

    const legal = legalPicks({
      openSlots: openSlots(draft, config),
      candidates: remainingCandidates(draft),
      team: current.team,
    })
    if (legal.length === 0) {
      logger.error({ draft: draft.id, turn }, 'auto-pick found nothing legal')
      return null
    }

    // pool order is join order, so the first match is the one who has waited longest
    const pick =
      draft.pool.flatMap(entry => legal.filter(option => option.steamId === entry.steamId))[0] ??
      legal[0]!

    logger.info({ draft: draft.id, turn, pick }, 'draft turn timed out, picking automatically')

    const withPick = await collections.queueCaptainsDrafts.findOneAndUpdate(
      { id: draft.id, [`picks.${turn}`]: { $exists: false } },
      {
        $push: {
          picks: {
            team: current.team,
            player: pick.steamId,
            gameClass: pick.gameClass,
            at: new Date(),
            auto: true,
          },
        },
      },
      { returnDocument: 'after' },
    )
    if (!withPick) {
      return null
    }

    return await resolveTurns(withPick)
  })
}
