import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { queue } from '../../queue'
import { ReadyUpDialog } from '../../queue-auto/views/html/ready-up-dialog'
import { QueueMode } from '../../shared/types/queue-mode'
import { safe } from '../../utils/safe'
import { DraftBoard } from '../views/html/draft-board'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    // The board is re-rendered per viewer: which picks are offered depends on whose turn it is,
    // so there is no one piece of markup to broadcast.
    const refreshBoard = () => {
      app.gateway.to({ url: '/' }).send(actor => DraftBoard({ actor }))
    }

    events.on('queueCaptains/draft:started', refreshBoard)
    events.on('queueCaptains/draft:updated', refreshBoard)

    events.on(
      'queue/state:updated',
      safe(async ({ state }) => {
        if (state !== QueueState.ready || (await queue.getMode()) !== QueueMode.captains) {
          return
        }

        const players = (await collections.queueCaptainsPool.find({ ready: false }).toArray()).map(
          entry => entry.player.steamId,
        )
        app.gateway.to({ players }).send(actor => ReadyUpDialog.show(actor!))
      }),
    )

    events.on(
      'queueCaptains/pool:left',
      safe(async ({ steamId }) => {
        const close = await ReadyUpDialog.close()
        app.gateway.to({ player: steamId }).send(() => close)
      }),
    )
  },
  { name: 'captains draft sync' },
)
