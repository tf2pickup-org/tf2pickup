import type { UpdateFilter } from 'mongodb'
import { collections } from '../../database/collections'
import { DraftState, type DraftModel, type DraftPick } from '../../database/models/draft.model'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { logger } from '../../logger'
import { config } from '../../queue-auto/config'
import { tasks } from '../../tasks'
import { legalPicks } from '../matching/legal-picks'
import { banOrder } from './ban-order'
import { currentTurn } from './current-turn'
import { openSlots } from './open-slots'
import { remainingCandidates } from './remaining-candidates'
import { remainingMaps } from './remaining-maps'

/**
 * Settle the draft up to the next turn that needs a decision, moving from picking players to
 * banning maps once the teams are full.
 *
 * Turns with only one legal option are committed straight away instead of burning the clock on a
 * non-choice, and that can cascade, so this loops until it reaches a turn with a real choice or
 * runs out of turns entirely.
 *
 * Callers already hold the queue lock — this never takes it.
 */
export async function resolveTurns(draft: DraftModel): Promise<DraftModel> {
  let current = draft

  for (;;) {
    if (current.state === DraftState.picking) {
      const turn = currentTurn(current, config)
      if (turn === null) {
        current = await beginMapBans(current)
        continue
      }

      const picks = legalPicks({
        openSlots: openSlots(current, config),
        candidates: remainingCandidates(current),
        team: turn.team,
      })

      if (picks.length === 0) {
        // legalPicks only ever offers picks that keep both teams completable, so reaching here
        // means the draft started from an impossible position and cannot be finished.
        logger.error({ draft: current.id, turn }, 'draft dead end: no legal picks')
        throw new Error(`draft ${current.id} dead-ended on turn ${turn.index + 1}`)
      }

      if (picks.length > 1) {
        return await awaitCaptain(current, 'queue.captains.pick_timeout')
      }

      const only = picks[0]!
      current = await appendPick(current, {
        team: turn.team,
        player: only.steamId,
        gameClass: only.gameClass,
        at: new Date(),
        forced: true,
      })
      continue
    }

    const bans = banOrder(current.mapOptions)
    if (current.mapBans.length >= bans.length || remainingMaps(current).length <= 1) {
      return await complete(current)
    }

    return await awaitCaptain(current, 'queue.captains.ban_timeout')
  }
}

async function appendPick(draft: DraftModel, pick: DraftPick): Promise<DraftModel> {
  return await update(draft, { $push: { picks: pick } })
}

async function beginMapBans(draft: DraftModel): Promise<DraftModel> {
  logger.info({ draft: draft.id }, 'teams are set, moving on to map bans')
  return await update(draft, { $set: { state: DraftState.banningMaps } })
}

async function awaitCaptain(
  draft: DraftModel,
  timeoutKey: 'queue.captains.pick_timeout' | 'queue.captains.ban_timeout',
): Promise<DraftModel> {
  const timeout = await configuration.get(timeoutKey)
  const updated = await update(draft, { $set: { turnEndsAt: new Date(Date.now() + timeout) } })

  // the turn number is part of the args so a timeout that fires late, after the captain already
  // acted, matches nothing and is ignored
  await tasks.schedule('queueCaptains:draftTurnTimeout', timeout, {
    draftId: updated.id,
    turn: updated.picks.length + updated.mapBans.length,
  })

  events.emit('queueCaptains/draft:updated', { draft: updated })
  return updated
}

async function complete(draft: DraftModel): Promise<DraftModel> {
  const updated = await update(draft, {
    $set: { state: DraftState.completed },
    $unset: { turnEndsAt: '' },
  })

  logger.info(
    { draft: updated.id, map: remainingMaps(updated)[0] },
    'draft completed, teams and map are set',
  )
  events.emit('queueCaptains/draft:updated', { draft: updated })
  events.emit('queueCaptains/draft:completed', { draft: updated })
  return updated
}

async function update(draft: DraftModel, changes: UpdateFilter<DraftModel>): Promise<DraftModel> {
  const updated = await collections.queueCaptainsDrafts.findOneAndUpdate(
    { id: draft.id },
    changes,
    {
      returnDocument: 'after',
    },
  )
  if (!updated) {
    throw new Error(`no such draft: ${draft.id}`)
  }

  return updated
}
