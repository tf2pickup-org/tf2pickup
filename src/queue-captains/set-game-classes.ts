import { collections } from '../database/collections'
import type { CaptainsPoolEntryModel } from '../database/models/captains-pool-entry.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import { configuration } from '../configuration'
import { config } from '../queue-auto/config'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import { playerAvatarUrl } from '../shared/player-avatar-url'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import { withLogLevel } from '../utils/with-log-level'
import { leave } from './leave'

/**
 * Set the classes a player is willing to play, joining the pool if they were not in it. Passing an
 * empty list leaves the queue, so the class toggles are the only control a player needs.
 */
export async function setGameClasses(
  steamId: SteamId64,
  gameClasses: Tf2ClassName[],
): Promise<CaptainsPoolEntryModel | null> {
  logger.trace({ steamId, gameClasses }, 'queueCaptains.setGameClasses()')

  const playable = config.classes.map(({ name }) => name)
  const wanted = [...new Set(gameClasses)].filter(gameClass => playable.includes(gameClass))
  if (wanted.length !== new Set(gameClasses).size) {
    throw errors.badRequest('class not played in this game mode')
  }

  if (wanted.length === 0) {
    await leave(steamId)
    return null
  }

  const player = await players.bySteamId(steamId, [
    'hasAcceptedRules',
    'activeGame',
    'steamId',
    'name',
    'avatar.medium',
    'verified',
  ])

  if (!player.hasAcceptedRules) {
    throw errors.badRequest('player has not accepted rules')
  }

  if (player.activeGame) {
    throw errors.badRequest('player has active game')
  }

  if ((await configuration.get('queue.require_player_verification')) && !player.verified) {
    throw errors.badRequest('player is not verified')
  }

  return await withQueueLock('captains:set-game-classes', async () => {
    const state = await getState()
    if (state !== QueueState.waiting) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const entry = await collections.queueCaptainsPool.findOneAndUpdate(
      { 'player.steamId': steamId },
      {
        $set: {
          gameClasses: wanted,
          player: {
            steamId: player.steamId,
            name: player.name,
            avatarUrl: playerAvatarUrl(player.avatar, 'medium'),
          },
        },
        $setOnInsert: { wantsToCaptain: false, ready: false, joinedAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    )

    events.emit('queueCaptains/pool:updated', { entries: [entry!] })
    return entry
  })
}
