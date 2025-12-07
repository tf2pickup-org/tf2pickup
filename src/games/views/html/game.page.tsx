import { resolve } from 'node:path'
import type { User } from '../../../auth/types/user'
import { type GameNumber } from '../../../database/models/game.model'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { GameSummary } from './game-summary'
import { GameSlotList } from './game-slot-list'
import { Footer } from '../../../html/components/footer'
import { GameEventList } from './game-event-list'
import { PlayerRole } from '../../../database/models/player.model'
import { makeTitle } from '../../../html/make-title'
import { ChooseGameServerDialog } from './choose-game-server-dialog'
import { AdminToolbox } from './admin-toolbox'
import { findOne } from '../../find-one'

export async function GamePage(props: { number: GameNumber; user?: User | undefined }) {
  const game = await findOne({ number: props.number })
  return (
    <Layout
      user={props.user}
      title={makeTitle(`game #${game.number}`)}
      description={`game #${game.number} details`}
      canonical={`/games/${game.number}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar user={props.user} />
      <Page>
        <div class="game-page container relative mx-auto">
          <GameSummary game={game} actor={props.user?.player.steamId} />
          <GameSlotList game={game} actor={props.user?.player.steamId} />
          <GameEventList game={game} />

          {props.user?.player.roles.includes(PlayerRole.admin) && <AdminToolbox game={game} />}
        </div>

        <ChooseGameServerDialog gameNumber={game.number} />
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
