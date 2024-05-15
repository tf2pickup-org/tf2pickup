import fp from 'fastify-plugin'
import { collections } from '../database/collections'
import { secondsToMilliseconds } from 'date-fns'
import { SteamId64 } from '../shared/types/steam-id-64'
import { logger } from '../logger'
import { OnlinePlayerList } from './views/online-player-list'

const verifyPlayerTimeout = secondsToMilliseconds(10)

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  async function verifyPlayer(steamId: SteamId64) {
    const playerSockets = [...app.websocketServer.clients].filter(
      socket => socket.player?.steamId === steamId,
    )
    logger.debug(`verify online status for ${steamId} (${playerSockets.length} sockets)`)
    await collections.onlinePlayers.deleteOne({
      steamId,
      ipAddress: {
        $size: 0,
      },
    })
    const cmp = await OnlinePlayerList()
    app.websocketServer.clients.forEach(client => {
      client.send(cmp)
    })
  }

  app.gateway.on('connected', async (socket, ipAddress) => {
    if (socket.player) {
      const player = await collections.players.findOne({ steamId: socket.player.steamId })
      if (!player) {
        throw new Error(`player ${socket.player.steamId} not found`)
      }

      app.log.debug(`${socket.player.steamId} (${player.name}) connected from ${ipAddress}`)

      await collections.onlinePlayers.updateOne(
        {
          steamId: socket.player.steamId,
        },
        {
          $addToSet: {
            ipAddress,
          },
          $set: {
            name: player.name,
          },
        },
        {
          upsert: true,
        },
      )

      socket.on('close', async () => {
        await collections.onlinePlayers.updateOne(
          {
            steamId: player.steamId,
          },
          {
            $pull: {
              ipAddress,
            },
          },
        )

        app.log.debug(`${player.steamId} (${player.name}) disconnected`)
        setTimeout(() => verifyPlayer(player.steamId), verifyPlayerTimeout)
      })

      const cmp = await OnlinePlayerList()
      app.websocketServer.clients.forEach(client => {
        client.send(cmp)
      })
    }
  })
})
