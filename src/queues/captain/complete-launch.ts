import { collections } from '../../database/collections'
import type { GameModel } from '../../database/models/game.model'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { applyMapCooldown } from '../../maps/apply-cooldown'
import { queueCommand } from '../queue-command'
import { get } from '../get'
import { captainMachine } from './machine'

export async function completeLaunch(game: GameModel) {
  if (game.launchMode !== 'captain' || !game.launchToken || !game.queue) return
  const queue = game.queue
  await queueCommand('captain-complete-launch', async emit => {
    const [settings, state, draft] = await Promise.all([
      get(queue),
      collections.queueState.findOne({ queue }),
      collections.captainDrafts.findOne({ queue }),
    ])
    if (
      !draft ||
      settings.launchMode !== 'captain' ||
      state?.state !== QueueState.launching ||
      draft.token !== game.launchToken
    )
      return
    await applyMapCooldown(queue, game.map)
    logger.info({ queue, gameNumber: game.number }, 'captain game launched')
    await captainMachine.toWaiting(settings, emit, {
      draft,
      remove: game.slots.map(slot => slot.player),
    })
  })
}
