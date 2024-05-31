import type { User } from '../../../auth/types/user'
import { collections } from '../../../database/collections'
import type { GameNumber } from '../../../database/models/game.model'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Layout } from '../../../html/layout'

export async function GamePage(number: GameNumber, user?: User) {
  const game = await collections.games.findOne({ number })
  if (!game) {
    throw new Error(`game not found: ${number}`)
  }

  return (
    <Layout title={`game #${game.number}`}>
      <NavigationBar user={user} />
    </Layout>
  )
}
