import { client } from './client'
import { findTargetChannel } from './find-target-channel'

export async function getPrivileges() {
  if (!client?.self) {
    return undefined
  }

  const [gamesChannel, serverRoot] = [await findTargetChannel(client), client.channels.byId(0)]
  if (!gamesChannel || !serverRoot) {
    return undefined
  }

  const [games, root] = await Promise.all([
    gamesChannel.getPermissions(),
    serverRoot.getPermissions(),
  ])
  return {
    enter: games.canJoinChannel,
    makeChannel: games.canCreateChannel,
    write: games.canWrite,
    register: root.canRegister,
    ban: root.canBan,
  }
}
