import fp from 'fastify-plugin'
import { events } from '../../events'
import { GameState, type GameModel } from '../../database/models/game.model'
import { configuration } from '../../configuration'
import { SlotStatus } from '../../database/models/game-slot.model'
import { debounce } from 'es-toolkit'
import { logger } from '../../logger'
import { forceEnd } from '../force-end'
import { GameEndedReason } from '../../database/models/game-event.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
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

    events.on('game:substituteRequested', ({ game }) => {
      maybeCloseGame(game)
    })
  },
  {
    name: 'auto close games with too many subsitute requests',
  },
)
