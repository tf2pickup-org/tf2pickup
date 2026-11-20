import fp from 'fastify-plugin'
import { events } from '../../events'
import { GameEventType } from '../../database/models/game-event.model'
import { PlayerConnectionStatus } from '../../database/models/game-slot.model'
import { update } from '../update'
import { safe } from '../../utils/safe'
import { gameLifecycle } from '../lifecycle'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    // Game servers fire match:started repeatedly (map load, mp_restartgame) and
    // re-fire match:ended after the game already left the started state; the
    // lifecycle ignores the ones that don't apply.
    events.on(
      'match:started',
      safe(async ({ gameNumber }) => {
        await gameLifecycle.start(gameNumber)
      }),
    )

    // The server reset its scoreboard mid-match (tournament restart — everyone
    // left to spectator, an admin re-exec'd the config, etc.) — rounds won
    // before the restart no longer count.
    events.on(
      'match/score:reset',
      safe(async ({ gameNumber }) => {
        await gameLifecycle.restart(gameNumber)
      }),
    )

    events.on(
      'match:ended',
      safe(async ({ gameNumber }) => {
        await gameLifecycle.end(gameNumber)
      }),
    )

    events.on(
      'match/player:connected',
      safe(async ({ gameNumber, steamId }) => {
        await gameLifecycle.setConnection(gameNumber, steamId, PlayerConnectionStatus.joining, {
          at: new Date(),
          event: GameEventType.playerJoinedGameServer,
          player: steamId,
        })
      }),
    )

    events.on(
      'match/player:joinedTeam',
      safe(async ({ gameNumber, steamId, team }) => {
        await gameLifecycle.setConnection(gameNumber, steamId, PlayerConnectionStatus.connected, {
          at: new Date(),
          event: GameEventType.playerJoinedGameServerTeam,
          player: steamId,
          team,
        })
      }),
    )

    events.on(
      'match/player:disconnected',
      safe(async ({ gameNumber, steamId }) => {
        await gameLifecycle.setConnection(gameNumber, steamId, PlayerConnectionStatus.offline, {
          at: new Date(),
          event: GameEventType.playerLeftGameServer,
          player: steamId,
        })
      }),
    )

    events.on(
      'match/logs:uploaded',
      safe(async ({ gameNumber, logsUrl }) => {
        await update(gameNumber, { $set: { logsUrl } })
      }),
    )

    events.on(
      'match/demo:uploaded',
      safe(async ({ gameNumber, demoUrl }) => {
        await update(gameNumber, {
          $set: { demoUrl },
        })
      }),
    )
  },
  { name: 'match event handler' },
)
