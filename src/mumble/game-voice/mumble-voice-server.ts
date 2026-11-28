import type { Channel } from '@tf2pickup-org/mumble-client'
import { client } from '../client'
import { findTargetChannel } from '../find-target-channel'
import { runInCommandQueue } from '../run-in-command-queue'
import type { VoiceChannel, VoiceServer } from './voice-server'

const mumble161001 = (1n << 48n) | (6n << 32n) | (1001n << 16n)

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
        const version: unknown = channel.client.serverVersion
        if (typeof version !== 'object' || version === null) {
          throw new Error('mumble handshake incomplete')
        }
        if ('versionV2' in version && version.versionV2 === mumble161001) {
          // This release looks up the certificate hash as a group name when saving.
          // Empty groups satisfy that lookup while the $ ACL still matches the certificate.
          const names = new Set(
            acl.entries.flatMap(({ group }) => (group?.startsWith('$') ? [group.slice(1)] : [])),
          )
          acl = {
            ...acl,
            groups: [
              ...acl.groups,
              ...Array.from(names, name => ({
                name,
                inherit: false,
                inheritable: false,
                inherited: false,
                add: [],
                remove: [],
                inheritedMembers: [],
              })),
            ],
          }
        }
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
