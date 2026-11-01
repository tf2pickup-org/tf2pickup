import { client } from './client'

export async function getPrivileges() {
  if (!client?.self) {
    return undefined
  }

  const serverRoot = client.channels.byId(0)
  if (!serverRoot) {
    return undefined
  }

  const [gamesRoot, root] = await Promise.all([
    client.user.channel.getPermissions(),
    serverRoot.getPermissions(),
  ])
  return {
    enter: gamesRoot.canJoinChannel,
    makeChannel: gamesRoot.canCreateChannel,
    write: gamesRoot.canWrite,
    move: gamesRoot.canMove,
    textMessage: gamesRoot.canSendTextMessage,
    register: root.canRegister,
    ban: root.canBan,
  }
}
