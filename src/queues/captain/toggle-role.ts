import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import { players } from '../../players'
import { playerAvatarUrl } from '../../shared/player-avatar-url'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withLogLevel } from '../../utils/with-log-level'
import { joinBlocker } from '../auto/join-blocker'
import { queueCommand } from '../auto/queue-command'
import { vacateSlot } from '../auto/vacate-slot'
import { get } from '../get'
import { getState } from '../get-state'
import { advance } from './advance'
import { assertCaptainQueue } from './assert-captain-queue'
import { captainRoles } from './captain-roles'
import { leavePools } from './leave-pools'
import { roleKey } from './role-key'

// The first role toggled on joins the pool, toggling off the last one leaves it.
export async function toggleRole(queue: QueueId, steamId: SteamId64, role: string) {
  const settings = await get(queue)
  assertCaptainQueue(settings)
  const target = captainRoles(settings.gamemode).find(candidate => roleKey(candidate) === role)
  if (!target) {
    throw errors.badRequest('no such role')
  }

  const player = await players.bySteamId(steamId, [
    'hasAcceptedRules',
    'bans',
    'activeGame',
    'skill',
    'steamId',
    'name',
    'avatar.medium',
    'verified',
  ])

  await queueCommand('captain-toggle-role', async emit => {
    const state = await getState(queue)
    if (state === QueueState.launching) {
      throw withLogLevel(errors.badRequest('invalid queue state'), 'debug')
    }

    const member = await collections.captainPool.findOne({ queue, 'player.steamId': steamId })
    if (member?.locked) {
      throw withLogLevel(errors.badRequest('you are locked into the current draft'), 'debug')
    }

    const blocker = joinBlocker(player, target, { ...settings, skillThreshold: null }, undefined)
    if (member) {
      const adding = !member.roles.includes(role)
      if (adding && blocker) {
        throw errors.badRequest(blocker)
      }
      const roles = member.roles.includes(role)
        ? member.roles.filter(current => current !== role)
        : [...member.roles, role]
      if (roles.length === 0) {
        await collections.captainPool.deleteOne({ queue, 'player.steamId': steamId })
        logger.info({ queue, steamId }, 'captain pool left')
      } else {
        await collections.captainPool.updateOne(
          { queue, 'player.steamId': steamId },
          { $set: { roles, ...(state === QueueState.ready ? { ready: true } : {}) } },
        )
      }
    } else {
      if (blocker) {
        throw errors.badRequest(blocker)
      }

      // a player is in at most one queue at a time; one who readied up for a game is locked in
      const slot = await collections.queueSlots.findOne({ 'player.steamId': steamId })
      if (slot) {
        if (slot.ready && (await getState(slot.queue)) === QueueState.ready) {
          throw withLogLevel(errors.badRequest('you are locked into another queue'), 'debug')
        }
        await vacateSlot(steamId, emit)
      }
      await leavePools(steamId, emit, queue)

      await collections.captainPool.insertOne({
        queue,
        player: {
          steamId: player.steamId,
          name: player.name,
          avatarUrl: playerAvatarUrl(player.avatar, 'medium'),
        },
        roles: [role],
        volunteer: false,
        ready: state === QueueState.ready,
        locked: false,
        joinedAt: new Date(),
      })
      logger.info({ queue, steamId, role }, 'captain pool joined')
    }

    emit('queue/captainPool:updated', { queue })
    await advance(queue, emit, { state, gamemode: settings.gamemode })
  })
}
