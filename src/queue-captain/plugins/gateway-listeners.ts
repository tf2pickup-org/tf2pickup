import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { errors } from '../../errors'
import { events } from '../../events'
import { logger } from '../../logger'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { banMap } from '../ban-map'
import { join } from '../join'
import { leave } from '../leave'
import { pick } from '../pick'
import { readyUp } from '../ready-up'

export default fp(
  async app => {
    let isActive = (await configuration.get('queue.mode')) === 'captain'

    events.on('queue/mode:changed', ({ mode }) => {
      isActive = mode === 'captain'
    })

    function wsSafe(
      fn: (
        socket: Parameters<Parameters<typeof app.gateway.on>[1]>[0],
        ...args: unknown[]
      ) => Promise<void>,
    ) {
      return (socket: Parameters<Parameters<typeof app.gateway.on>[1]>[0], ...args: unknown[]) => {
        if (!isActive) return
        fn(socket, ...args).catch((error: unknown) => {
          logger.error(error)
        })
      }
    }

    app.gateway.on(
      'queue:join',
      wsSafe(async (socket, offeredClasses, wantsCaptain) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await join(socket.player.steamId, offeredClasses as Tf2ClassName[], Boolean(wantsCaptain))
      }),
    )

    app.gateway.on(
      'queue:leave',
      wsSafe(async socket => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await leave(socket.player.steamId)
      }),
    )

    app.gateway.on(
      'queue:readyup',
      wsSafe(async socket => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await readyUp(socket.player.steamId)
      }),
    )

    app.gateway.on(
      'queue:pick',
      wsSafe(async (socket, playerSteamId, gameClass) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await pick(socket.player.steamId, playerSteamId as SteamId64, gameClass as Tf2ClassName)
      }),
    )

    app.gateway.on(
      'queue:banMap',
      wsSafe(async (socket, map) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await banMap(socket.player.steamId, map as string)
      }),
    )
  },
  { name: 'captain gateway listeners' },
)
