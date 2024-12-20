import fp from 'fastify-plugin'
import { events } from '../../events'
import { whitelistPlayer } from '../rcon/whitelist-player'
import { safe } from '../../utils/safe'
import { blacklistPlayer } from '../rcon/blacklist-player'
import { collections } from '../../database/collections'
import { sayChat } from '../rcon/say-chat'

export default fp(
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
      'game:playerReplaced',
      safe(async ({ game, replacee, replacement }) => {
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
        await blacklistPlayer(game, replacee)
        await sayChat(game, `${re.name} has been replaced by ${rm.name}`)
      }),
    )
  },
  {
    name: 'manage in-game players',
    encapsulate: true,
  },
)
