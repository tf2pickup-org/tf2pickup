import { configuration } from '../../configuration'
import { GameEventType, type PlayerReplaced } from '../../database/models/game-event.model'
import type { GameModel } from '../../database/models/game.model'
import { tasks } from '../../tasks'

export async function scheduleFreePlayers(game: GameModel) {
  const substitutes = new Set(
    game.events
      .filter(
        (e): e is PlayerReplaced =>
          e.event === GameEventType.playerReplaced && e.replacee !== e.replacement,
      )
      .map(({ replacement }) => replacement),
  )
  const queueCooldown = await configuration.get('games.join_queue_cooldown')
  await Promise.all(
    game.slots.map(async ({ gameClass, player }) => {
      const cooldownMs = substitutes.has(player) ? 0 : queueCooldown[gameClass]
      await tasks.schedule('games.freePlayer', cooldownMs, { player })
    }),
  )
}
