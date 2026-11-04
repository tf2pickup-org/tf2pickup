import { client } from './client'
import { findTargetChannel } from './find-target-channel'
import { gamesRootAcl } from './games-root-acl'
import { isVerificationEnabled } from './is-verification-enabled'

export async function getPrivileges() {
  if (!client?.self) {
    return undefined
  }

  const [gamesChannel, serverRoot] = [await findTargetChannel(client), client.channels.byId(0)]
  if (!gamesChannel || !serverRoot) {
    return undefined
  }

  const [games, root, gamesRootAclApplied] = await Promise.all([
    gamesChannel.getPermissions(),
    serverRoot.getPermissions(),
    (async () => (await isVerificationEnabled()) && (await gamesRootAcl.isApplied()))(),
  ])
  return {
    enter: games.canJoinChannel,
    makeChannel: games.canCreateChannel,
    write: games.canWrite,
    move: root.canMove,
    register: root.canRegister,
    ban: root.canBan,
    gamesRootAcl: gamesRootAclApplied,
  }
}
