import { escapeRegExp } from 'es-toolkit'
import { collections } from '../database/collections'
import type { GameEventModel } from '../database/models/game-event.model'
import { PlayerRole } from '../database/models/player.model'
import { errors } from '../errors'
import { captainEngine } from '../queues/captain'
import { queueEngine } from '../queues/auto'
import { deletedUserSteamId, type SteamId64 } from '../shared/types/steam-id-64'
import { forPlayer } from './mutex'

// Permanently deletes a player. The player document is removed (so their
// profile 404s and they disappear from the player list and hall of fame) and
// every historical reference to their steam id (games, chat, activity log) is
// replaced with a sentinel so it renders as "deleted user". Player action logs
// intentionally keep the real steam id for auditing.
export async function deletePlayer(steamId: SteamId64): Promise<void> {
  await assertDeletable(steamId)
  // outside forPlayer(): kicking cancels pre-ready, which updates the player under that lock
  await queueEngine.removePlayer(steamId)
  await captainEngine.kickFromPools(steamId)

  await forPlayer(steamId).runExclusive(async () => {
    // the player may have been promoted while we were removing them from the queue
    await assertDeletable(steamId)
    await anonymizeGames(steamId)

    await collections.chatMessages.updateMany(
      { author: steamId },
      { $set: { author: deletedUserSteamId } },
    )
    await anonymizeChatMentions(steamId)

    await collections.activityLog.updateMany(
      { player: steamId },
      { $set: { player: deletedUserSteamId } },
    )
    await collections.activityLog.updateMany(
      { actor: steamId },
      { $set: { actor: deletedUserSteamId } },
    )

    // Remove any live presence so dangling references don't break online views.
    await collections.onlinePlayers.deleteMany({ steamId })

    await collections.players.deleteOne({ steamId })
  })
}

async function assertDeletable(steamId: SteamId64): Promise<void> {
  const player = await collections.players.findOne({ steamId }, { projection: { roles: 1 } })
  if (!player) {
    throw errors.notFound(`Player with steamId ${steamId} does not exist`)
  }
  if (player.roles.includes(PlayerRole.superUser)) {
    throw errors.forbidden('Super-users cannot be deleted')
  }
}

async function anonymizeGames(steamId: SteamId64): Promise<void> {
  const games = await collections.games
    .find({
      $or: [
        { 'slots.player': steamId },
        { 'captains.red': steamId },
        { 'captains.blu': steamId },
        { 'events.player': steamId },
        { 'events.actor': steamId },
        { 'events.replacee': steamId },
        { 'events.replacement': steamId },
      ],
    })
    .toArray()

  for (const game of games) {
    const slots = game.slots.map(slot =>
      slot.player === steamId ? { ...slot, player: deletedUserSteamId } : slot,
    )
    const events = game.events.map(event => anonymizeEvent(event, steamId)) as typeof game.events

    const captains = game.captains && {
      red: game.captains.red === steamId ? deletedUserSteamId : game.captains.red,
      blu: game.captains.blu === steamId ? deletedUserSteamId : game.captains.blu,
    }
    await collections.games.updateOne(
      { _id: game._id },
      { $set: { slots, events, ...(captains ? { captains } : {}) } },
    )
  }
}

// Chat mentions embed the mentioned player's steam id both in the rendered
// `body` (as an <a href="/players/{steamId}"> anchor) and in `originalBody`
// (as an `@<steamId>` token), so a plain field update is not enough — both
// strings have to be rewritten to drop the steam id and the link.
async function anonymizeChatMentions(steamId: SteamId64): Promise<void> {
  const messages = await collections.chatMessages.find({ mentions: steamId }).toArray()
  const anchor = new RegExp(
    `<a href="/players/${escapeRegExp(steamId)}" class="mention">[^<]*</a>`,
    'g',
  )

  for (const message of messages) {
    const mentions = message.mentions.map(mention =>
      mention === steamId ? deletedUserSteamId : mention,
    )
    const body = message.body.replace(
      anchor,
      '<span class="mention text-zinc-600 italic">deleted user</span>',
    )
    const originalBody = message.originalBody.replaceAll(`@<${steamId}>`, '@deleted user')

    await collections.chatMessages.updateOne(
      { _id: message._id },
      { $set: { mentions, body, originalBody } },
    )
  }
}

function anonymizeEvent(event: GameEventModel, steamId: SteamId64): GameEventModel {
  const next = { ...event } as Record<string, unknown>
  for (const key of ['player', 'actor', 'replacee', 'replacement']) {
    if (next[key] === steamId) {
      next[key] = deletedUserSteamId
    }
  }
  return next as unknown as GameEventModel
}
