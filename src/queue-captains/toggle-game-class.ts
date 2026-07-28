import { collections } from '../database/collections'
import type { CaptainsPoolEntryModel } from '../database/models/captains-pool-entry.model'
import { QueueState } from '../database/models/queue-state.model'
import { configuration } from '../configuration'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import { config } from '../queue-auto/config'
import { getState } from '../queue/get-state'
import { withQueueLock } from '../queue/with-queue-lock'
import { preReady } from '../pre-ready'
import { playerAvatarUrl } from '../shared/player-avatar-url'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import { withLogLevel } from '../utils/with-log-level'

/**
 * Add or drop one class, joining the pool on the first and leaving it on the last. That makes the
 * class toggles the only control a player needs.
 *
 * The read and the write happen together under the queue lock. Splitting them loses classes: two
 * toggles sent in quick succession both read the same state and the second write wins, so a player
 * who picks two classes in one go ends up signed on for one.
 */
export async function toggleGameClass(
  steamId: SteamId64,
  gameClass: Tf2ClassName,
): Promise<CaptainsPoolEntryModel | null> {
  logger.trace({ steamId, gameClass }, 'queueCaptains.toggleGameClass()')

  if (!config.classes.some(({ name }) => name === gameClass)) {
    throw errors.badRequest('class not played in this game mode')
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

  return await withQueueLock('captains:toggle-class', async () => {
    if ((await getState()) !== QueueState.waiting) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const existing = await collections.queueCaptainsPool.findOne({ 'player.steamId': steamId })
    const gameClasses = new Set(existing?.gameClasses ?? [])
    if (gameClasses.has(gameClass)) {
      gameClasses.delete(gameClass)
    } else {
      gameClasses.add(gameClass)
    }

    if (gameClasses.size === 0) {
      await collections.queueCaptainsPool.deleteOne({ 'player.steamId': steamId })
      events.emit('queueCaptains/pool:left', { steamId })
      await preReady.cancel(steamId)
      return null
    }

    const entry = await collections.queueCaptainsPool.findOneAndUpdate(
      { 'player.steamId': steamId },
      {
        $set: {
          gameClasses: [...gameClasses],
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
