import { collections } from '../../database/collections'
import { DraftState, type DraftModel, type DraftPick } from '../../database/models/draft.model'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { logger } from '../../logger'
import { config } from '../../queue-auto/config'
import { tasks } from '../../tasks'
import { legalPicks } from '../matching/legal-picks'
import { currentTurn } from './current-turn'
import { openSlots } from './open-slots'
import { remainingCandidates } from './remaining-candidates'

/**
 * Settle the draft up to the next turn that needs a decision.
 *
 * Turns with only one legal pick are committed straight away instead of burning the clock on a
 * non-choice, and that can cascade, so this loops until it reaches a turn with a real choice or
 * runs out of turns entirely.
 *
 * Callers already hold the queue lock — this never takes it.
 */
export async function resolveTurns(draft: DraftModel): Promise<DraftModel> {
  let current = draft

  for (;;) {
    const turn = currentTurn(current, config)
    if (turn === null) {
      return await complete(current)
    }

    const picks = legalPicks({
      openSlots: openSlots(current, config),
      candidates: remainingCandidates(current),
      team: turn.team,
    })

    if (picks.length === 0) {
      // legalPicks only ever offers picks that keep both teams completable, so reaching here means
      // the draft started from an impossible position and cannot be finished.
      logger.error({ draft: current.id, turn }, 'draft dead end: no legal picks')
      throw new Error(`draft ${current.id} dead-ended on turn ${turn.index + 1}`)
    }

    if (picks.length > 1) {
      return await awaitCaptain(current)
    }

    const only = picks[0]!
    current = await append(current, {
      team: turn.team,
      player: only.steamId,
      gameClass: only.gameClass,
      at: new Date(),
      forced: true,
    })
  }
}

async function append(draft: DraftModel, pick: DraftPick): Promise<DraftModel> {
  const updated = await collections.queueCaptainsDrafts.findOneAndUpdate(
    { id: draft.id },
    { $push: { picks: pick } },
    { returnDocument: 'after' },
  )
  if (!updated) {
    throw new Error(`no such draft: ${draft.id}`)
  }

  return updated
}

async function awaitCaptain(draft: DraftModel): Promise<DraftModel> {
  const timeout = await configuration.get('queue.captains.pick_timeout')
  const turnEndsAt = new Date(Date.now() + timeout)

  const updated = await collections.queueCaptainsDrafts.findOneAndUpdate(
    { id: draft.id },
    { $set: { turnEndsAt } },
    { returnDocument: 'after' },
  )
  if (!updated) {
    throw new Error(`no such draft: ${draft.id}`)
  }

  // the turn index is part of the args so a timeout that fires late, after the captain already
  // picked, matches nothing and is ignored
  await tasks.schedule('queueCaptains:draftTurnTimeout', timeout, {
    draftId: updated.id,
    turn: updated.picks.length,
  })

  events.emit('queueCaptains/draft:updated', { draft: updated })
  return updated
}

async function complete(draft: DraftModel): Promise<DraftModel> {
  const updated = await collections.queueCaptainsDrafts.findOneAndUpdate(
    { id: draft.id },
    { $set: { state: DraftState.completed }, $unset: { turnEndsAt: '' } },
    { returnDocument: 'after' },
  )
  if (!updated) {
    throw new Error(`no such draft: ${draft.id}`)
  }

  logger.info({ draft: updated.id }, 'draft completed')
  events.emit('queueCaptains/draft:updated', { draft: updated })
  events.emit('queueCaptains/draft:completed', { draft: updated })
  return updated
}
