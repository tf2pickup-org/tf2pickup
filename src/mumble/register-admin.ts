import { PlayerRole } from '../database/models/player.model'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { client } from './client'
import { runInCommandQueue } from './run-in-command-queue'

// Mumble groups take registered users only, so admins are registered on Mumble to join the admin
// group. Returns whether the player got a Mumble user ID.
export async function registerAdmin(steamId: SteamId64) {
  const { roles, mumbleCertificate } = await players.bySteamId(steamId, [
    'roles',
    'mumbleCertificate',
  ])
  if (
    !mumbleCertificate ||
    mumbleCertificate.userId !== undefined ||
    !roles.some(role => [PlayerRole.admin, PlayerRole.superUser].includes(role))
  ) {
    return false
  }

  const user = client?.users.findAll(({ hash }) => hash === mumbleCertificate.hash)[0]
  if (!user) {
    return false
  }

  if (!user.isRegistered) {
    await runInCommandQueue(async () => await user.register())
  }

  const { userId } = user
  if (userId === undefined) {
    return false
  }

  await players.update(steamId, { $set: { 'mumbleCertificate.userId': userId } })
  return true
}
