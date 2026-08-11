import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { errors } from '../../errors'
import { FlashMessage } from '../../html/components/flash-message'
import { queueWsCallDuration } from '../../queue/metrics'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { logError } from '../../utils/log-error'
import { measureTime } from '../../utils/measure-time'
import type { AppWebSocket } from '../../websocket/types'
import { setGameClasses } from '../set-game-classes'
import { toggleCaptain } from '../toggle-captain'

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

        const entry = await collections.queueCaptainsPool.findOne({
          'player.steamId': socket.player.steamId,
        })
        const current = new Set(entry?.gameClasses ?? [])
        if (current.has(gameClass)) {
          current.delete(gameClass)
        } else {
          current.add(gameClass)
        }

        await setGameClasses(socket.player.steamId, [...current])
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
