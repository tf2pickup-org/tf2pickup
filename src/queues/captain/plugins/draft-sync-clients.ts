import fp from 'fastify-plugin'
import { events } from '../../../events'
import { safe } from '../../../utils/safe'
import { get } from '../../get'
import { queuePage } from '../../page'
import { FlashMessage } from '../../../html/components/flash-message'
import { queuePageUrl } from '../../page/queue-page-url'
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
      'queue/captainDraft:failed',
      safe(async ({ queue, message }) => {
        const { slug } = await get(queue)
        const flash = await FlashMessage({ type: 'error', message })
        app.gateway.to({ urls: [queuePageUrl(slug)] }).send(() => flash)
      }),
    )

    events.on(
      'queue/captainDraft:turn',
      safe(async ({ captain, deadline, phase }) => {
        const notice = await CaptainTurnNotice({
          actor: captain,
          title: phase === 'ban' ? 'Your ban!' : 'Your pick!',
          deadline,
        })
        app.gateway.to({ player: captain }).send(() => notice)
      }),
    )
  },
  { name: 'captain draft update clients' },
)
