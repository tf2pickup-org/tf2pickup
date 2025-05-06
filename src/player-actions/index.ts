import fp from 'fastify-plugin'
import { events } from '../events'
import { collections } from '../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  events.on('match/player:connected', async ({ gameNumber, steamId, ipAddress }) => {
    await collections.playerActions.insertOne({
      player: steamId,
      ipAddress,
      action: `connected to gameserver (game #${gameNumber})`,
      timestamp: new Date(),
    })
  })

  events.on('player:connected', async ({ steamId, metadata }) => {
    await collections.playerActions.insertOne({
      player: steamId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      action: `went online`,
      timestamp: new Date(),
    })
  })

  events.on('match/player:said', async ({ gameNumber, steamId, message }) => {
    await collections.playerActions.insertOne({
      player: steamId,
      action: `said "${message}" (game #${gameNumber})`,
      timestamp: new Date(),
    })
  })
})
