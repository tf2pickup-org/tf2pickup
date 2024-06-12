import { resolve } from 'node:path'
import type { User } from '../../../auth/types/user'
import { collections } from '../../../database/collections'
import type { GameNumber } from '../../../database/models/game.model'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Style } from '../../../html/components/style'
import { Layout } from '../../../html/layout'
import { GameSummary } from './game-summary'
import { GameSlotList } from './game-slot-list'
import { Footer } from '../../../html/components/footer'

export async function GamePage(number: GameNumber, user?: User) {
  const game = await collections.games.findOne({ number })
  if (!game) {
    throw new Error(`game not found: ${number}`)
  }

  return (
    <Layout
      title={`game #${game.number}`}
      head={<Style fileName={resolve(import.meta.dirname, 'style.css')} />}
    >
      <NavigationBar user={user} />
      <Page>
        <div class="container mx-auto grid grid-cols-4 gap-x-4">
          <div>
            <GameSummary game={game} actor={user?.player.steamId} />
          </div>

          <div class="col-span-3">
            <GameSlotList game={game} />
          </div>
        </div>
      </Page>
      <Footer user={user} />
    </Layout>
  )
}
