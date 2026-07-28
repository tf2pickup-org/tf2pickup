import { collections } from '../../database/collections'
import type { DraftModel } from '../../database/models/draft.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import { config } from '../../queue-auto/config'
import { withQueueLock } from '../../queue/with-queue-lock'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { legalPicks } from '../matching/legal-picks'
import { withLogLevel } from '../../utils/with-log-level'
import { currentTurn } from './current-turn'
import { getCurrent } from './get-current'
import { openSlots } from './open-slots'
import { remainingCandidates } from './remaining-candidates'
import { resolveTurns } from './resolve-turns'

export async function makePick(
  actor: SteamId64,
  player: SteamId64,
  gameClass: Tf2ClassName,
): Promise<DraftModel> {
  return await withQueueLock('captains:make-pick', async () => {
    logger.trace({ actor, player, gameClass }, 'queueCaptains.makePick()')

    const draft = await getCurrent()
    if (!draft) {
      throw withLogLevel(errors.badRequest('no draft in progress'), 'debug')
    }

    const turn = currentTurn(draft, config)
    if (turn === null) {
      throw withLogLevel(errors.badRequest('the draft is over'), 'debug')
    }

    if (draft.captains[turn.team] !== actor) {
      throw withLogLevel(errors.forbidden('it is not your turn'), 'debug')
    }

    const legal = legalPicks({
      openSlots: openSlots(draft, config),
      candidates: remainingCandidates(draft),
      team: turn.team,
    })
    if (!legal.some(pick => pick.steamId === player && pick.gameClass === gameClass)) {
      throw withLogLevel(errors.badRequest('that pick is not available'), 'debug')
    }

    const withPick = await collections.queueCaptainsDrafts.findOneAndUpdate(
      // the turn index guards against two picks racing into the same turn
      { id: draft.id, [`picks.${turn.index}`]: { $exists: false } },
      { $push: { picks: { team: turn.team, player, gameClass, at: new Date() } } },
      { returnDocument: 'after' },
    )
    if (!withPick) {
      throw withLogLevel(errors.conflict('that turn has already been taken'), 'debug')
    }

    return await resolveTurns(withPick)
  })
}
