import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { MumbleVerificationMethod } from '../../database/models/player.model'
import { events } from '../../events'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:updated',
      safe(async ({ before, after, adminId }) => {
        const [was, is] = [before.mumbleCertificate, after.mumbleCertificate]
        if (was?.hash === is?.hash) {
          return
        }

        const action = is
          ? `linked Mumble certificate ${is.hash} by ${is.method === MumbleVerificationMethod.ipMatch ? 'IP match' : 'verification code'}`
          : `Mumble certificate ${was!.hash} unlinked${adminId ? ` by ${adminId}` : ''}`
        await collections.playerActions.insertOne({
          player: after.steamId,
          action,
          timestamp: new Date(),
        })
      }),
    )
  },
  { name: 'log mumble certificate changes' },
)
