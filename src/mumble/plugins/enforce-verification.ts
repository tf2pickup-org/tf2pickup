import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { SlotStatus } from '../../database/models/game-slot.model'
import { GameState, type GameModel } from '../../database/models/game.model'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { gamesRootAcl } from '../games-root-acl'
import { isVerificationEnabled } from '../is-verification-enabled'
import { moveToTeamChannel } from '../move-to-team-channel'
import { registerAdmin } from '../register-admin'
import { MumbleClientStatus } from '../status'
import { syncGameAcl } from '../sync-game-acl'

const liveStates = [
  GameState.created,
  GameState.configuring,
  GameState.launching,
  GameState.started,
]

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
        if (status === MumbleClientStatus.connected && (await isVerificationEnabled())) {
          await reconcile()
        }
      }),
    )

    events.on(
      'game:updated',
      safe(async ({ before, after }) => {
        if (occupancy(before) !== occupancy(after) && (await isVerificationEnabled())) {
          await syncGameAcl(after)
        }
      }),
    )

    events.on(
      'player:updated',
      safe(async ({ before, after }) => {
        const hash = after.mumbleCertificate?.hash
        const bound = hash !== undefined && hash !== before.mumbleCertificate?.hash
        const rolesChanged = before.roles.join() !== after.roles.join()
        if ((!bound && !rolesChanged) || !(await isVerificationEnabled())) {
          return
        }

        if (bound) {
          const game = await collections.games.findOne({
            state: { $in: liveStates },
            'slots.player': after.steamId,
          })
          if (game) {
            await syncGameAcl(game)
            await moveToTeamChannel(after.steamId, hash)
          }
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
  await gamesRootAcl.apply(enabled)
  if (!enabled) {
    return
  }

  const games = await collections.games
    .find({ state: { $in: liveStates } }, { projection: { number: 1, slots: 1 } })
    .toArray()
  for (const game of games) {
    await syncGameAcl(game)
  }
}

function occupancy({ slots }: Pick<GameModel, 'slots'>) {
  return slots
    .filter(({ status }) => [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(status))
    .map(({ player, team }) => `${player}:${team}`)
    .sort()
    .join()
}
