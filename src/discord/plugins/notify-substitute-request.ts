import fp from 'fastify-plugin'
import { events } from '../../events'
import type { GameModel } from '../../database/models/game.model'
import { errors } from '../../errors'
import { EmbedBuilder } from 'discord.js'
import { environment } from '../../environment'
import { forEachEnabledChannel } from '../for-each-enabled-channel'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import type { GameSlotId } from '../../shared/types/game-slot-id'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  events.on('game:substituteRequested', ({ game, slotId }) => notify(game, slotId))
  events.on('game:playerReplaced', ({ game, slotId }) => invalidate(game, slotId))
  events.on('game:ended', ({ game }) => invalidateAll(game))
})

async function notify(game: GameModel, slotId: GameSlotId) {
  const slot = game.slots.find(({ id }) => id === slotId)
  if (!slot) {
    throw errors.internalServerError(`game #${game.number} has no such slot: ${slotId}`)
  }

  const embed = new EmbedBuilder()
    .setColor('#f1ff70')
    .setTitle('A substitute is needed')
    .addFields(
      {
        name: 'Game no.',
        value: `#${game.number}`,
      },
      {
        name: 'Class',
        value: slot.gameClass,
      },
      {
        name: 'Team',
        value: slot.team.toUpperCase(),
      },
    )
    .setURL(`${environment.WEBSITE_URL}/games/${game.number}`)
    .setTimestamp()

  await forEachEnabledChannel('substituteNotifications', async (channel, config) => {
    const role = config.role ? channel.guild.roles.cache.get(config.role) : undefined
    const message = await channel.send({
      ...(role?.mentionable ? { content: role.toString() } : {}),
      embeds: [embed],
    })
    await collections.discordSubstituteNotifications.updateOne(
      {
        guildId: channel.guild.id,
        gameNumber: game.number,
        slotId: slot.id,
      },
      {
        $set: {
          messageId: message.id,
        },
      },
      {
        upsert: true,
      },
    )
  })
}

async function invalidate(game: GameModel, slotId: GameSlotId) {
  const slot = game.slots.find(({ id }) => id === slotId)
  if (!slot) {
    throw errors.internalServerError(`game #${game.number} has no such slot: ${slotId}`)
  }

  const embed = new EmbedBuilder()
    .setColor('#f1ff70')
    .setTitle('A substitute was needed')
    .addFields({
      name: 'Game no.',
      value: `#${game.number}`,
    })
    .setURL(`${environment.WEBSITE_URL}/games/${game.number}`)
    .setTimestamp()

  await forEachEnabledChannel('substituteNotifications', async channel => {
    const notification = await collections.discordSubstituteNotifications.findOne({
      guildId: channel.guild.id,
      gameNumber: game.number,
      slotId: slot.id,
    })
    if (!notification) {
      logger.warn(
        { gameNumber: game.number, guildId: channel.guild.id, slotId: slot.id },
        'substitute notification message not found',
      )
      return
    }

    const message = await channel.messages.fetch(notification.messageId)
    await message.edit({ embeds: [embed] })
    await collections.discordSubstituteNotifications.deleteOne({ _id: notification._id })
  })
}

async function invalidateAll(game: GameModel) {
  const embed = new EmbedBuilder()
    .setColor('#f1ff70')
    .setTitle('A substitute was needed')
    .addFields({
      name: 'Game no.',
      value: `#${game.number}`,
    })
    .setURL(`${environment.WEBSITE_URL}/games/${game.number}`)
    .setTimestamp()

  await forEachEnabledChannel('substituteNotifications', async channel => {
    const notifications = await collections.discordSubstituteNotifications
      .find({ guildId: channel.guild.id, gameNumber: game.number })
      .toArray()
    await Promise.all(
      notifications.map(async ({ _id, messageId }) => {
        const message = await channel.messages.fetch(messageId)
        await message.edit({ embeds: [embed] })
        await collections.discordSubstituteNotifications.deleteOne({ _id })
      }),
    )
  })
}
