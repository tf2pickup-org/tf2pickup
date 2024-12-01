import { toUpper } from 'lodash-es'
import type { GameModel } from '../database/models/game.model'
import { assertClientIsConnected } from './assert-client-is-connected'
import { client } from './client'
import { moveToTargetChannel } from './move-to-target-channel'
import { Tf2Team } from '../shared/types/tf2-team'
import { games } from '../games'
import { collections } from '../database/collections'
import { mumbleDirectUrl } from './mumble-direct-url'

// subchannels for each game
const subChannelNames = [toUpper(Tf2Team.blu), toUpper(Tf2Team.red)]

export async function setupGameChannels(game: GameModel) {
  assertClientIsConnected(client)
  await moveToTargetChannel()
  const channelName = `${game.number}`
  const channel = await client.user.channel.createSubChannel(channelName)
  await Promise.all(
    subChannelNames.map(async subChannelName => await channel.createSubChannel(subChannelName)),
  )

  // update game
  await games.update(game.number, {
    $set: (
      await Promise.all(
        game.slots.map(async slot => {
          const player = await collections.players.findOne({ steamId: slot.player })
          if (player === null) {
            throw new Error(`no such player: ${slot.player.toString()}`)
          }
          return await mumbleDirectUrl(game, player.steamId)
        }),
      )
    ).reduce(
      (acc, url, i) => {
        acc[`slots.${i}.voiceServerUrl`] = url.toString()
        return acc
      },
      {} as Record<`slots.${number}.voiceServerUrl`, string>,
    ),
  })
}
