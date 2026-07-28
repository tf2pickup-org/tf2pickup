import { sample } from 'es-toolkit'
import { collections } from '../../database/collections'
import { DraftState, type DraftModel } from '../../database/models/draft.model'
import { logger } from '../../logger'
import { config } from '../../queue-auto/config'
import { withQueueLock } from '../../queue/with-queue-lock'
import { legalPicks } from '../matching/legal-picks'
import { banOrder } from './ban-order'
import { currentTurn } from './current-turn'
import { getCurrent } from './get-current'
import { openSlots } from './open-slots'
import { remainingCandidates } from './remaining-candidates'
import { remainingMaps } from './remaining-maps'
import { resolveTurns } from './resolve-turns'

/**
 * The captain ran out of time, so the turn is taken for them.
 *
 * For a player pick that is the longest-waiting player still available, on the first class of
 * theirs that is legal — deterministic, so a draft replays exactly from its log, and it rewards
 * patience in the queue rather than rolling dice on someone's night. A map ban has no such
 * ordering to lean on, so it falls to chance.
 */
export async function autoPick(draftId: string, turn: number): Promise<DraftModel | null> {
  return await withQueueLock('captains:auto-pick', async () => {
    const draft = await getCurrent()
    if (draft?.id !== draftId) {
      return null
    }

    // the captain got there first; this timeout belongs to a turn that is already settled
    if (draft.picks.length + draft.mapBans.length !== turn) {
      return null
    }

    return draft.state === DraftState.picking
      ? await autoPickPlayer(draft, turn)
      : await autoBanMap(draft)
  })
}

async function autoPickPlayer(draft: DraftModel, turn: number): Promise<DraftModel | null> {
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

  // pool order is join order, so the first match is whoever has waited longest
  const pick =
    draft.pool.flatMap(entry => legal.filter(option => option.steamId === entry.steamId))[0] ??
    legal[0]!

  logger.info({ draft: draft.id, turn, pick }, 'draft turn timed out, picking automatically')

  const withPick = await collections.queueCaptainsDrafts.findOneAndUpdate(
    { id: draft.id, [`picks.${draft.picks.length}`]: { $exists: false } },
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

  return withPick ? await resolveTurns(withPick) : null
}

async function autoBanMap(draft: DraftModel): Promise<DraftModel | null> {
  const team = banOrder(draft.mapOptions)[draft.mapBans.length]
  const options = remainingMaps(draft)
  if (team === undefined || options.length <= 1) {
    return null
  }

  const map = sample(options)
  logger.info({ draft: draft.id, team, map }, 'map ban timed out, banning automatically')

  const withBan = await collections.queueCaptainsDrafts.findOneAndUpdate(
    { id: draft.id, [`mapBans.${draft.mapBans.length}`]: { $exists: false } },
    { $push: { mapBans: { team, map, at: new Date(), auto: true } } },
    { returnDocument: 'after' },
  )

  return withBan ? await resolveTurns(withBan) : null
}
