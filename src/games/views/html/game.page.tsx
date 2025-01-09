import { resolve } from 'node:path'
import type { User } from '../../../auth/types/user'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { GameSummary } from './game-summary'
import { GameSlotList } from './game-slot-list'
import { Footer } from '../../../html/components/footer'
import { GameEventList } from './game-event-list'
import { PlayerRole } from '../../../database/models/player.model'
import { AdminActions } from './admin-actions'
import { makeTitle } from '../../../html/make-title'

export async function GamePage(props: { game: GameModel; user?: User | undefined }) {
  return (
    <Layout
      title={makeTitle(`game #${props.game.number}`)}
      description={`game #${props.game.number} details`}
      canonical={`/games/${props.game.number}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar user={props.user} />
      <Page>
        <div class="container relative mx-auto grid grid-cols-4 gap-x-4">
          <div class="order-first flex flex-col">
            <GameSummary game={props.game} actor={props.user?.player.steamId} />
            <span class="col-span-2 mb-2 mt-8 text-2xl font-bold text-white">Game events</span>
            <GameEventList game={props.game} />
          </div>

          <div class="col-span-3">
            <GameSlotList game={props.game} actor={props.user?.player.steamId} />
          </div>

          {[
            GameState.created,
            GameState.configuring,
            GameState.launching,
            GameState.started,
          ].includes(props.game.state) && props.user?.player.roles.includes(PlayerRole.admin) ? (
            <AdminActions gameNumber={props.game.number} />
          ) : (
            <></>
          )}
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
