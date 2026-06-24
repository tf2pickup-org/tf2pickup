import { escapeRegExp } from 'es-toolkit'
import { collections } from '../database/collections'
import type { GameEventModel } from '../database/models/game-event.model'
import { PlayerRole } from '../database/models/player.model'
import { errors } from '../errors'
import { deletedUserSteamId, type SteamId64 } from '../shared/types/steam-id-64'
import { forPlayer } from './mutex'

// Permanently deletes a player. The player document is removed (so their
// profile 404s and they disappear from the player list and hall of fame) and
// every historical reference to their steam id (games, chat, activity log) is
// replaced with a sentinel so it renders as "deleted user". Player action logs
// intentionally keep the real steam id for auditing.
export async function deletePlayer(steamId: SteamId64): Promise<void> {
  await forPlayer(steamId).runExclusive(async () => {
    const player = await collections.players.findOne({ steamId }, { projection: { roles: 1 } })
    if (!player) {
      throw errors.notFound(`Player with steamId ${steamId} does not exist`)
    }
    if (player.roles.includes(PlayerRole.superUser)) {
      throw errors.forbidden('Super-users cannot be deleted')
    }

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

    // Remove any live presence so dangling references don't break queue/online views.
    await collections.onlinePlayers.deleteMany({ steamId })
    await collections.queueSlots.updateMany(
      { 'player.steamId': steamId },
      { $set: { player: null, ready: false } },
    )
    await collections.queueFriends.deleteMany({
      $or: [{ source: steamId }, { target: steamId }],
    })

    await collections.players.deleteOne({ steamId })
  })
}

async function anonymizeGames(steamId: SteamId64): Promise<void> {
  const games = await collections.games
    .find({
      $or: [
        { 'slots.player': steamId },
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

    await collections.games.updateOne({ _id: game._id }, { $set: { slots, events } })
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
      '<span class="mention text-abru-light-25 italic">deleted user</span>',
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
