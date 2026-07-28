import fp from 'fastify-plugin'
import { errors } from '../../errors'
import { FlashMessage } from '../../html/components/flash-message'
import { queueWsCallDuration } from '../../queue/metrics'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { logError } from '../../utils/log-error'
import { measureTime } from '../../utils/measure-time'
import type { AppWebSocket } from '../../websocket/types'
import { makePick } from '../draft/make-pick'
import { leave } from '../leave'
import { readyUp } from '../ready-up'
import { toggleGameClass } from '../toggle-game-class'
import { toggleCaptain } from '../toggle-captain'
import { ReadyUpDialog } from '../../queue-auto/views/html/ready-up-dialog'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    function wsSafe<Args extends unknown[]>(
      operation: string,
      fn: (socket: AppWebSocket, ...args: Args) => Promise<void>,
    ) {
      return (socket: AppWebSocket, ...args: Args) => {
        measureTime(
          async () => {
            await fn(socket, ...args)
          },
          ({ ms, result }) => {
            queueWsCallDuration.record(ms, { operation, result })
          },
        ).catch(async (error: unknown) => {
          logError(error)
          if (error instanceof Error) {
            socket.send(await FlashMessage({ message: `Error: ${error.message}`, type: 'error' }))
          }
        })
      }
    }

    // one control for joining, changing classes and leaving: toggling off the last class leaves
    app.gateway.on(
      'queue:captainsclass',
      wsSafe('captains:class', async (socket, gameClass: Tf2ClassName) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await toggleGameClass(socket.player.steamId, gameClass)
      }),
    )

    app.gateway.on(
      'queue:captainspick',
      wsSafe('captains:pick', async (socket, pick: string) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const [player, gameClass] = pick.split(':') as [SteamId64, Tf2ClassName]
        await makePick(socket.player.steamId, player, gameClass)
      }),
    )

    app.gateway.on(
      'queue:captainsreadyup',
      wsSafe('captains:readyup', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const [, close] = await Promise.all([readyUp(socket.player.steamId), ReadyUpDialog.close()])
        app.gateway.to({ player: socket.player.steamId }).send(() => close)
      }),
    )

    app.gateway.on(
      'queue:captainsleave',
      wsSafe('captains:leave', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const close = await ReadyUpDialog.close()
        await leave(socket.player.steamId)
        app.gateway.to({ player: socket.player.steamId }).send(() => close)
      }),
    )

    app.gateway.on(
      'queue:captainsvolunteer',
      wsSafe('captains:volunteer', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await toggleCaptain(socket.player.steamId)
      }),
    )
  },
  { name: 'captains queue gateway listeners' },
)
