import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { PlayerRole } from '../../database/models/player.model'
import { events } from '../../events'
import { client } from '../client'
import { safe } from '../../utils/safe'
import { gameVoice } from '../game-voice'
import { gamesRootAcl } from '../games-root-acl'
import { isVerificationEnabled } from '../is-verification-enabled'
import { registerAdmin } from '../register-admin'
import { MumbleClientStatus } from '../status'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'configuration:updated',
      safe(async ({ key }) => {
        if (key === 'games.voice_server.mumble.player_verification') {
          await reconcile()
        }
      }),
    )

    events.on(
      'mumble/connectionStatusChanged',
      safe(async ({ status }) => {
        // also when off, so turning it off while the bot was disconnected still takes effect
        if (status === MumbleClientStatus.connected) {
          await reconcile()
        }
      }),
    )

    events.on(
      'player:updated',
      safe(async ({ before, after }) => {
        const hash = after.mumbleCertificate?.hash
        const bound = hash !== undefined && hash !== before.mumbleCertificate?.hash
        const unlinked = !!before.mumbleCertificate && !after.mumbleCertificate
        const rolesChanged = before.roles.join() !== after.roles.join()
        if ((!bound && !unlinked && !rolesChanged) || !(await isVerificationEnabled())) {
          return
        }

        if (bound || unlinked) {
          await gameVoice.syncPlayer(after.steamId)
        }

        if (unlinked) {
          if (before.mumbleCertificate?.registration) {
            await gamesRootAcl.apply(true)
          }
          return
        }

        if (bound) {
          await gameVoice.seat(after.steamId, hash)
        }

        if ((await registerAdmin(after.steamId)) || rolesChanged) {
          await gamesRootAcl.apply(true)
        }
      }),
    )

    events.on(
      'mumble/userJoined',
      safe(async ({ user }) => {
        if (!user.hash || !(await isVerificationEnabled())) {
          return
        }

        const player = await collections.players.findOne(
          { 'mumbleCertificate.hash': user.hash },
          { projection: { steamId: 1 } },
        )
        if (player && (await registerAdmin(player.steamId))) {
          await gamesRootAcl.apply(true)
        }
      }),
    )
  },
  { name: 'mumble verification enforcement' },
)

async function reconcile() {
  const enabled = await isVerificationEnabled()
  if (enabled) {
    await registerConnectedAdmins()
  }

  await gamesRootAcl.apply(enabled)
  if (!enabled) {
    return
  }

  await gameVoice.syncLive()
}

// users already on the server when the bot connects never trigger mumble/userJoined
async function registerConnectedAdmins() {
  const hashes = client?.users.findAll(({ hash }) => !!hash).map(({ hash }) => hash!) ?? []
  const admins = await collections.players
    .find(
      {
        roles: { $in: [PlayerRole.admin, PlayerRole.superUser] },
        'mumbleCertificate.hash': { $in: hashes },
      },
      { projection: { steamId: 1 } },
    )
    .toArray()
  for (const { steamId } of admins) {
    await registerAdmin(steamId)
  }
}
