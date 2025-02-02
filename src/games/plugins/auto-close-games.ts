import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { GameState, type GameModel } from '../../database/models/game.model'
import { configuration } from '../../configuration'
import { SlotStatus } from '../../database/models/game-slot.model'
import { debounce } from 'es-toolkit'
import { logger } from '../../logger'
import { forceEnd } from '../force-end'
import { GameEndedReason } from '../../database/models/game-event.model'

export default fp(
  async () => {
    const maybeCloseGame = debounce(async (game: GameModel) => {
      if (
        ![
          GameState.created,
          GameState.configuring,
          GameState.launching,
          GameState.started,
        ].includes(game.state)
      ) {
        return
      }

      const threshold = await configuration.get('games.auto_force_end_threshold')
      if (threshold <= 0) {
        return
      }

      const subRequests = game.slots.filter(
        slot => slot.status === SlotStatus.waitingForSubstitute,
      ).length
      if (subRequests >= threshold) {
        logger.info(
          { game, subRequestCount: subRequests, threshold },
          `game #${game.number} has too many substitute requests; the game will be force-ended`,
        )
        await forceEnd(game.number, 'bot', GameEndedReason.tooManySubstituteRequests)
      }
    }, 100)

    events.on(
      'game:substituteRequested',
      safe(async ({ game }) => {
        await maybeCloseGame(game)
      }),
    )
  },
  {
    name: 'auto close games with too many subsitute requests',
  },
)
