import type { SteamId64 } from '../shared/types/steam-id-64'
import { collections } from '../database/collections'
import { fetchUser } from './fetch-user'
import { fetchUserAccessToken } from './fetch-user-access-token'

function makeAvatarUrl(user: { id: string; avatar: string | null | undefined }) {
  if (!user.avatar) {
    return null
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
}

export async function saveUserProfile({ steamId, code }: { steamId: SteamId64; code: string }) {
  const token = await fetchUserAccessToken(code)
  const user = await fetchUser(token)

  await collections.players.updateOne(
    { steamId },
    {
      $set: {
        discordProfile: {
          userId: user.id,
          username: user.username,
          displayName: user.global_name ?? user.username,
          avatarUrl: makeAvatarUrl({ id: user.id, avatar: user.avatar }),
        },
      },
    },
  )
}
