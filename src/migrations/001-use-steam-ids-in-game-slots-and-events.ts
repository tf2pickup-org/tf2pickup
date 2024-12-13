import { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { GameEventType } from '../database/models/game-event.model'
import { isBot, type Bot } from '../shared/types/bot'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { PlayerRole } from '../database/models/player.model'

// Previously, game slots and events used Mongo IDs to reference players.
// This migration changes these references to SteamIds.

export async function up() {
  const games = await collections.games.find().toArray()
  let count = 0
  for (const game of games) {
    for (const slot of game.slots) {
      if (!ObjectId.isValid(slot.player)) {
        continue
      }

      const player = await collections.players.findOne({ _id: new ObjectId(slot.player) })
      if (player === null) {
        throw new Error(`player ${slot.player.toString()} not found (game #${game.number})`)
      }

      await collections.games.updateOne(
        { number: game.number },
        {
          $set: {
            'slots.$[slot].player': player.steamId,
          },
        },
        {
          arrayFilters: [
            {
              'slot.player': { $eq: slot.player },
            },
          ],
        },
      )
    }

    for (const event of game.events) {
      switch (event.event) {
        case GameEventType.gameEnded:
        case GameEventType.gameServerAssigned: {
          if (!event.actor || !ObjectId.isValid(event.actor)) {
            continue
          }

          const actor = await collections.players.findOne({ _id: new ObjectId(event.actor) })
          await collections.games.updateOne(
            { number: game.number },
            {
              $set: {
                'events.$[event].actor': actor?.steamId ?? 'bot',
              },
            },
            {
              arrayFilters: [
                {
                  'event.at': { $eq: event.at },
                  'event.event': { $eq: event.event },
                },
              ],
            },
          )
          break
        }

        case GameEventType.playerJoinedGameServer:
        case GameEventType.playerJoinedGameServerTeam:
        case GameEventType.playerLeftGameServer: {
          if (!event.player) {
            throw new Error(`player is missing (game #${game.number})`)
          }

          if (!ObjectId.isValid(event.player)) {
            continue
          }

          const player = await collections.players.findOne({ _id: new ObjectId(event.player) })
          if (player === null) {
            throw new Error(`player ${event.player.toString()} not found (game #${game.number})`)
          }

          await collections.games.updateOne(
            { number: game.number },
            {
              $set: {
                'events.$[event].player': player.steamId,
              },
            },
            {
              arrayFilters: [
                {
                  'event.at': { $eq: event.at },
                  'event.event': { $eq: event.event },
                },
              ],
            },
          )
          break
        }

        case GameEventType.substituteRequested: {
          if (!event.player) {
            throw new Error(`player is missing (game #${game.number})`)
          }

          if (!ObjectId.isValid(event.player)) {
            continue
          }

          const player = await collections.players.findOne({ _id: new ObjectId(event.player) })
          if (player === null) {
            throw new Error(`player ${event.player.toString()} not found (game #${game.number})`)
          }

          let actor: SteamId64 | Bot
          if (!event.actor || isBot(event.actor)) {
            actor = 'bot' as Bot
          } else {
            const a = await collections.players.findOne({ _id: new ObjectId(event.actor) })
            if (a === null) {
              throw new Error(`actor ${event.actor.toString()} not found (game #${game.number})`)
            }

            if (a.roles.includes('bot' as PlayerRole)) {
              actor = 'bot' as Bot
            } else {
              actor = a.steamId
            }
          }

          await collections.games.updateOne(
            { number: game.number },
            {
              $set: {
                'events.$[event].player': player.steamId,
                'events.$[event].actor': actor,
              },
            },
            {
              arrayFilters: [
                {
                  'event.at': { $eq: event.at },
                  'event.event': { $eq: event.event },
                },
              ],
            },
          )
          break
        }

        case GameEventType.playerReplaced: {
          if (!event.replacee) {
            throw new Error(`replacee is missing (game #${game.number})`)
          }

          if (!event.replacement) {
            throw new Error(`replacement is missing (game #${game.number})`)
          }

          if (!ObjectId.isValid(event.replacee)) {
            continue
          }

          const replacee = await collections.players.findOne({ _id: new ObjectId(event.replacee) })
          if (replacee === null) {
            throw new Error(
              `replacee ${event.replacee.toString()} not found (game #${game.number})`,
            )
          }

          const replacement = await collections.players.findOne({
            _id: new ObjectId(event.replacement),
          })
          if (replacement === null) {
            throw new Error(
              `replacement ${event.replacement.toString()} not found (game #${game.number})`,
            )
          }

          await collections.games.updateOne(
            { number: game.number },
            {
              $set: {
                'events.$[event].replacee': replacee.steamId,
                'events.$[event].replacement': replacement.steamId,
              },
            },
            {
              arrayFilters: [
                {
                  'event.at': { $eq: event.at },
                  'event.event': { $eq: event.event },
                },
              ],
            },
          )
          break
        }
      }
    }
    count += 1
  }
  logger.info(`migrated ${count} games`)
}
