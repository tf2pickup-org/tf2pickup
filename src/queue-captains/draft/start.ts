import { nanoid } from 'nanoid'
import { collections } from '../../database/collections'
import { DraftState, type DraftModel } from '../../database/models/draft.model'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { logger } from '../../logger'
import { config } from '../../queue-auto/config'
import { setState } from '../../queue/set-state'
import { resetMapOptions } from '../../maps/reset-options'
import { getPool } from '../get-pool'
import { drawCaptains } from './draw-captains'
import { resolveTurns } from './resolve-turns'

/**
 * Freeze the pool and start drafting.
 *
 * Must be called *without* the queue lock held: `setState` takes it, and the mutex is not
 * reentrant.
 *
 * Closing the queue comes first on purpose. Joining requires the waiting state and leaving is
 * refused while launching, so once the state flips the pool cannot move — which is what makes the
 * snapshot taken a moment later trustworthy. From then on the draft only ever reads its own copy,
 * so nothing happening in the live pool can disturb a draft in progress.
 */
export async function start(): Promise<DraftModel> {
  await setState(QueueState.launching)

  try {
    const pool = await getPool()
    const captains = drawCaptains(pool, config)
    // normally seeded at boot and after every game, but a draft with nothing to ban is not a
    // draft, so make sure there is something on the table
    if ((await collections.queueMapOptions.countDocuments()) === 0) {
      await resetMapOptions()
    }
    const mapOptions = (await collections.queueMapOptions.find().toArray()).map(({ name }) => name)

    const draft: DraftModel = {
      id: nanoid(),
      state: DraftState.picking,
      createdAt: new Date(),
      captains,
      pool: pool.map(({ player, gameClasses }) => ({
        steamId: player.steamId,
        name: player.name,
        avatarUrl: player.avatarUrl,
        gameClasses,
      })),
      picks: [],
      mapOptions,
      mapBans: [],
    }

    await collections.queueCaptainsDrafts.insertOne(draft)
    logger.info({ draft: draft.id, captains, pool: pool.length }, 'draft started')
    events.emit('queueCaptains/draft:started', { draft })

    return await resolveTurns(draft)
  } catch (error) {
    // never leave the queue closed with no draft to show for it
    logger.error({ error }, 'failed to start the draft, reopening the queue')
    await setState(QueueState.waiting)
    throw error
  }
}
