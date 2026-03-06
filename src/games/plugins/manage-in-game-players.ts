import fp from 'fastify-plugin'
import { events } from '../../events'
import { whitelistPlayer } from '../rcon/whitelist-player'
import { safe } from '../../utils/safe'
import { blacklistPlayer } from '../rcon/blacklist-player'
import { collections } from '../../database/collections'
import { sayChat } from '../rcon/say-chat'
import { errors } from '../../errors'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:substituteRequested',
      safe(async ({ game, replacee }) => {
        const re = await collections.players.findOne({ steamId: replacee })
        if (!re) {
          throw new Error(`player not found: ${replacee}`)
        }

        await sayChat(game, `Looking for replacement for ${re.name}...`)
      }),
    )

    events.on(
      'game:ended',
      safe(async ({ game }) => {
        await collections.gamesDeferredKicks.deleteMany({ gameNumber: game.number })
      }),
    )

    events.on(
      'match/player:connected',
      safe(async ({ gameNumber, steamId }) => {
        const deferredKicks = await collections.gamesDeferredKicks
          .find({ gameNumber, replacement: steamId })
          .toArray()
        if (deferredKicks.length === 0) {
          return
        }

        const game = await collections.games.findOne({ number: gameNumber })
        if (!game) {
          throw errors.internalServerError(`game not found: ${gameNumber}`)
        }

        for (const deferredKick of deferredKicks) {
          await blacklistPlayer(game, deferredKick.replacee)
          await collections.gamesDeferredKicks.deleteOne({ _id: deferredKick._id })
        }
      }),
    )

    events.on(
      'game:playerReplaced',
      safe(async ({ game, replacee, replacement, slotId }) => {
        if (replacee === replacement) {
          return
        }

        const re = await collections.players.findOne({ steamId: replacee })
        if (!re) {
          throw new Error(`player not found: ${replacee}`)
        }

        const rm = await collections.players.findOne({ steamId: replacement })
        if (!rm) {
          throw new Error(`player not found: ${replacement}`)
        }

        await whitelistPlayer(game, replacement)
        await collections.gamesDeferredKicks.updateOne(
          { gameNumber: game.number, slotId },
          { $set: { gameNumber: game.number, slotId, replacee, replacement } },
          { upsert: true },
        )
        await sayChat(game, `${re.name} has been replaced by ${rm.name}`)
      }),
    )
  },
  {
    name: 'manage in-game players',
    encapsulate: true,
  },
)
