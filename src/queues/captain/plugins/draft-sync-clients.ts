import fp from 'fastify-plugin'
import { events } from '../../../events'
import { safe } from '../../../utils/safe'
import { get } from '../../get'
import { queuePage } from '../../page'
import { CaptainTurnNotice } from '../views/html/captain-turn-notice'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on(
      'queue/state:updated',
      safe(async ({ queue }) => {
        if ((await get(queue)).launchMode !== 'captain') return
        await queuePage.update(app.gateway, queue, {
          captainStage: true,
          captainDraft: true,
          captainPool: true,
          counts: true,
        })
      }),
    )

    events.on(
      'queue/captainDraft:updated',
      safe(async ({ queue }) => {
        await queuePage.update(app.gateway, queue, { captainDraft: true })
      }),
    )

    events.on(
      'queue/captainDraft:turn',
      safe(async ({ captain, deadline }) => {
        const notice = await CaptainTurnNotice({ actor: captain, title: 'Your pick!', deadline })
        app.gateway.to({ player: captain }).send(() => notice)
      }),
    )
  },
  { name: 'captain draft update clients' },
)
