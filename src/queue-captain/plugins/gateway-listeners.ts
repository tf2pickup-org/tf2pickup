import fp from 'fastify-plugin'
import { watchMode } from '../../queue/watch-mode'
import { errors } from '../../errors'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { AppWebSocket } from '../../websocket/types'
import { wsSafe } from '../../websocket/ws-safe'
import { addOfferedClass } from '../add-offered-class'
import { banMap } from '../ban-map'
import { leave } from '../leave'
import { pick } from '../pick'
import { readyUp } from '../ready-up'
import { removeOfferedClass } from '../remove-offered-class'
import { setWantsCaptain } from '../set-wants-captain'
import { ReadyUpDialog } from '../../queue-auto/views/html/ready-up-dialog'

export default fp(
  async app => {
    const isActive = await watchMode('captain')

    // `queue:leave` and `queue:readyup` are registered by both modes, so every
    // handler has to no-op when it is not the active one.
    function captainWs<Args extends unknown[]>(
      operation: string,
      fn: (socket: AppWebSocket, ...args: Args) => Promise<void>,
    ) {
      return wsSafe(operation, async (socket: AppWebSocket, ...args: Args) => {
        if (!isActive()) return
        await fn(socket, ...args)
      })
    }

    app.gateway.on(
      'captain:joinClass',
      captainWs('captain:joinClass', async (socket, gameClass) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await addOfferedClass(socket.player.steamId, gameClass as Tf2ClassName)
      }),
    )

    app.gateway.on(
      'captain:leaveClass',
      captainWs('captain:leaveClass', async (socket, gameClass) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await removeOfferedClass(socket.player.steamId, gameClass as Tf2ClassName)
      }),
    )

    app.gateway.on(
      'captain:toggleCaptain',
      captainWs('captain:toggleCaptain', async (socket, wantsCaptain) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await setWantsCaptain(socket.player.steamId, wantsCaptain)
      }),
    )

    app.gateway.on(
      'queue:leave',
      captainWs('captain:leave', async socket => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await leave(socket.player.steamId)
      }),
    )

    app.gateway.on(
      'queue:readyup',
      captainWs('captain:readyup', async socket => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await readyUp(socket.player.steamId)
        const close = ReadyUpDialog.close()
        app.gateway.to({ player: socket.player.steamId }).send(() => close)
      }),
    )

    app.gateway.on(
      'queue:pick',
      captainWs('captain:pick', async (socket, playerSteamId, gameClass) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await pick(socket.player.steamId, playerSteamId, gameClass as Tf2ClassName)
      }),
    )

    app.gateway.on(
      'queue:banMap',
      captainWs('captain:banMap', async (socket, map) => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        await banMap(socket.player.steamId, map)
      }),
    )
  },
  { name: 'captain gateway listeners' },
)
