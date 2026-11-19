import type { Channel } from '@tf2pickup-org/mumble-client'
import { client } from '../client'
import { findTargetChannel } from '../find-target-channel'
import { runInCommandQueue } from '../run-in-command-queue'
import type { VoiceChannel, VoiceServer } from './voice-server'

export const mumbleVoiceServer: VoiceServer = {
  async gamesChannel() {
    const channel = client?.self && (await findTargetChannel(client))
    return channel ? wrap(channel) : undefined
  },
  users() {
    return (client?.users.findAll(() => true) ?? []).map(user => ({
      get hash() {
        return user.hash
      },
      get channelId() {
        return user.channelId
      },
      async moveToChannel(channelId: number) {
        await runInCommandQueue(async () => await user.moveToChannel(channelId))
      },
    }))
  },
}

function wrap(channel: Channel): VoiceChannel {
  return {
    id: channel.id,
    name: channel.name,
    get subChannels() {
      return channel.subChannels.map(wrap)
    },
    get userCount() {
      return channel.users.length
    },
    async createSubChannel(name) {
      return wrap(await channel.createSubChannel(name))
    },
    async saveAcl(acl) {
      // the update and the query that confirms it
      await runInCommandQueue(async () => {
        await channel.saveAcl(acl)
      }, 2)
    },
    async link(other) {
      await channel.link(other.id)
    },
    async remove() {
      await channel.remove()
    },
  }
}
