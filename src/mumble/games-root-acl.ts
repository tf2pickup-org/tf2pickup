import type { AclEntry, AclGroup } from '@tf2pickup-org/mumble-client'
import { collections } from '../database/collections'
import { PlayerRole } from '../database/models/player.model'
import { client } from './client'
import { findTargetChannel } from './find-target-channel'
import { mumblePermission } from './mumble-permission'
import { runInCommandQueue } from './run-in-command-queue'

const adminGroup = 'tf2pickup-admins'

// Nobody but the admins can enter the channels under the games channel; each game's channels then
// let their own players in. The games channel itself stays as the server admin set it up.
const entries: AclEntry[] = [
  {
    applyHere: false,
    applySubs: true,
    inherited: false,
    group: 'all',
    grant: 0,
    deny: mumblePermission.enter,
  },
  {
    applyHere: false,
    applySubs: true,
    inherited: false,
    group: adminGroup,
    grant: mumblePermission.voice,
    deny: 0,
  },
]

const isSame = (a: AclEntry, b: AclEntry) =>
  a.applyHere === b.applyHere &&
  a.applySubs === b.applySubs &&
  a.group === b.group &&
  a.grant === b.grant &&
  a.deny === b.deny
const isOwnEntry = (acl: AclEntry) => entries.some(entry => isSame(acl, entry))

export const gamesRootAcl = {
  async apply(enabled: boolean) {
    const channel = client && (await findTargetChannel(client))
    if (!channel) {
      return
    }

    const acl = await runInCommandQueue(async () => await channel.fetchAcl())
    // a save replaces the channel's own entries and groups with what it gets, inherited ones too
    const kept = acl.entries.filter(entry => !entry.inherited && !isOwnEntry(entry))
    // ponytail: a group defined here with no members and default flags looks inherited and is
    // dropped; harmless, as it matches nobody
    const groups = acl.groups
      .filter(
        ({ name, add, remove, inherit, inheritable }) =>
          name !== adminGroup && (add.length || remove.length || !inherit || !inheritable),
      )
      .map(group => ({ ...group, inheritedMembers: [] }))

    await runInCommandQueue(async () => {
      await channel.saveAcl({
        ...acl,
        entries: [...kept, ...(enabled ? entries : [])],
        groups: [...groups, ...(enabled ? [await buildAdminGroup()] : [])],
      })
    })
  },

  async isApplied() {
    const channel = client && (await findTargetChannel(client))
    if (!channel) {
      return false
    }

    // ponytail: outside the command queue so the admin page doesn't wait for it; one read
    const own = (await channel.fetchAcl()).entries.filter(entry => !entry.inherited)
    return entries.every(entry => own.some(acl => isSame(acl, entry)))
  },
}

async function buildAdminGroup(): Promise<AclGroup> {
  const admins = await collections.players
    .find(
      {
        roles: { $in: [PlayerRole.admin, PlayerRole.superUser] },
        'mumbleCertificate.userId': { $exists: true },
      },
      { projection: { 'mumbleCertificate.userId': 1 } },
    )
    .toArray()
  return {
    name: adminGroup,
    inherited: false,
    inherit: true,
    inheritable: true,
    add: admins.map(({ mumbleCertificate }) => mumbleCertificate!.userId!),
    remove: [],
    inheritedMembers: [],
  }
}
