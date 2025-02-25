import type { SteamId64 } from '../shared/types/steam-id-64'
import { collections } from '../database/collections'
import { fetchUserAccessToken } from './fetch-user-access-token'
import { fetchUser } from './fetch-user'

export async function saveUserProfile({ steamId, code }: { steamId: SteamId64; code: string }) {
  const token = await fetchUserAccessToken(code)
  const user = await fetchUser(token)

  await collections.players.updateOne(
    { steamId },
    {
      $set: {
        twitchTvProfile: {
          userId: user.id,
          login: user.login,
          displayName: user.display_name,
          profileImageUrl: user.profile_image_url,
        },
      },
    },
  )
}
