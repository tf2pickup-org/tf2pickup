import fp from 'fastify-plugin'
import { secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { collections } from '../../database/collections'
import { SlotStatus } from '../../database/models/game-slot.model'
import { GameState } from '../../database/models/game.model'
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

        if (!user.name || (user.hash && (await isBound(user.hash)))) {
          return
        }

        if (!(await isUnverifiedPlayer(user.name))) {
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

// the game page's voice link connects with the player's name, so this skips Mumble users who
// aren't here for a pickup game on general-purpose servers
async function isUnverifiedPlayer(mumbleName: string) {
  const games = await collections.games
    .find(
      { state: { $in: [GameState.launching, GameState.started] } },
      { projection: { slots: 1 } },
    )
    .toArray()
  const steamIds = games.flatMap(({ slots }) =>
    slots
      .filter(({ status }) => [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(status))
      .map(({ player }) => player),
  )
  const unverified = await collections.players
    .find(
      { steamId: { $in: steamIds }, mumbleCertificate: { $exists: false } },
      { projection: { name: 1 } },
    )
    .toArray()
  return unverified.some(({ name }) => name.replace(/\s+/g, '_') === mumbleName)
}
