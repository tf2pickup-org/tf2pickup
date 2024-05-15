import { User } from '../../auth/types/user'
import { collections } from '../../database/collections'
import { SteamId64 } from '../../shared/types/steam-id-64'
import { Layout } from '../../views/layout'
import { NavigationBar } from '../../views/navigation-bar'

export async function Player(steamId: SteamId64, user?: User) {
  const player = await collections.players.findOne({ steamId })
  if (!player) {
    throw new Error(`player not found: ${steamId}`)
  }

  return (
    <Layout title={player.name}>
      <NavigationBar user={user} />
    </Layout>
  )
}
