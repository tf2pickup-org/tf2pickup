import { resolve } from 'node:path'
import { type GameNumber, type GameModel } from '../../../database/models/game.model'
import { gameStateLabel } from '../../game-state-label'
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
import { requestContext } from '@fastify/request-context'
import { environment } from '../../../environment'

export async function GamePage(props: { number: GameNumber }) {
  const user = requestContext.get('user')
  const game = await findOne({ number: props.number }, [
    'number',
    'gamemode',
    'map',
    'state',
    'slots',
    'events',
    'gameServer',
    'logsUrl',
    'demoUrl',
    'score',
    'connectString',
    'stvConnectString',
  ])
  const actor = user?.player.steamId
  return (
    <Layout
      title={makeTitle(`game #${game.number}`)}
      description={gameDescription(game)}
      image={`/games/${game.number}/og-image.png`}
      canonical={`/games/${game.number}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar />
      <Page>
        <div class={`game-page config-${environment.QUEUE_CONFIG} relative container mx-auto`}>
          <GameSummary game={game} actor={actor} />
          <GameSlotList game={game} actor={actor} />
          <GameEventList game={game} />

          {user?.player.roles.includes(PlayerRole.admin) && <AdminToolbox game={game} />}
        </div>

        <ChooseGameServerDialog gameNumber={game.number} />
      </Page>
      <Footer />
    </Layout>
  )
}

function gameDescription(game: Pick<GameModel, 'number' | 'map' | 'state' | 'score'>) {
  const parts = [`game #${game.number}`, game.map]
  if (game.score) {
    parts.push(`RED ${game.score.red} : ${game.score.blu} BLU`)
  } else {
    parts.push(gameStateLabel(game.state))
  }
  return parts.join(' · ')
}
