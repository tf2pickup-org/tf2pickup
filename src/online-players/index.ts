import fp from 'fastify-plugin'
import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { logger } from '../logger'
import { events } from '../events'
import { secondsToMilliseconds } from 'date-fns'
import { tasks } from '../tasks'

const verifyPlayerTimeout = secondsToMilliseconds(10)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    // verify the player is online
    async function verifyPlayer({ player }: { player: SteamId64 }) {
      const playerSockets = [...app.websocketServer.clients].filter(
        socket => socket.player?.steamId === player,
      )
      logger.debug(`verify online status for ${player} (${playerSockets.length} sockets)`)
      const { deletedCount } = await collections.onlinePlayers.deleteOne({
        steamId: player,
        ipAddress: {
          $size: 0,
        },
      })
      if (deletedCount > 0) {
        events.emit('player:disconnected', { steamId: player })
      }
    }
    tasks.register('onlinePlayers:validatePlayer', verifyPlayer)

    app.gateway.on('connected', async (socket, ipAddress, userAgent) => {
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
          await tasks.schedule('onlinePlayers:validatePlayer', verifyPlayerTimeout, {
            player: player.steamId,
          })
        })

        events.emit('player:connected', {
          steamId: player.steamId,
          metadata: {
            ipAddress,
            userAgent,
          },
        })
      }
    })
  },
  { name: 'online players' },
)
