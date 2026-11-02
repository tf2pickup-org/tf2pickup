import fp from 'fastify-plugin'
import { secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { collections } from '../../database/collections'
import { environment } from '../../environment'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { client } from '../client'
import { fetchUserAddress } from '../fetch-user-address'
import { isVerificationEnabled } from '../is-verification-enabled'
import { matchByIp } from '../match-by-ip'

// the game server connection may come in right after the Mumble one
const unverifiedNoticeDelay = secondsToMilliseconds(10)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'match/player:connected',
      safe(async ({ steamId, ipAddress }) => {
        if (await isVerificationEnabled()) {
          await matchByIp(ipAddress, steamId)
        }
      }),
    )

    events.on(
      'mumble/userJoined',
      safe(async ({ user }) => {
        if (!(await isVerificationEnabled()) || (user.hash && (await isBound(user.hash)))) {
          return
        }

        const address = await fetchUserAddress(user)
        if (user.hash && address) {
          await matchByIp(address)
        }

        await delay(unverifiedNoticeDelay)
        if (client?.users.bySession(user.session) !== user) {
          return
        }

        if (user.hash && (await isBound(user.hash))) {
          return
        }

        await user.sendMessage(
          `Game channels are open only to their players. To get in, link your Mumble certificate to your tf2pickup account: ${environment.WEBSITE_URL}/mumble`,
        )
      }),
    )
  },
  { name: 'mumble verification by ip' },
)

async function isBound(hash: string) {
  return (await collections.players.countDocuments({ 'mumbleCertificate.hash': hash })) > 0
}
