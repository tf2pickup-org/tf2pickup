import { resolve } from 'node:path'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Layout } from '../../../html/layout'
import { collections } from '../../../database/collections'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { GameListItem } from './game-list-item'
import { Pagination, paginate } from '../../../html/components/pagination'
import { makeTitle } from '../../../html/make-title'
import type { PickDeep } from 'type-fest'
import type { GameModel } from '../../../database/models/game.model'
import { GamemodeTabs, type GamemodeTab } from '../../../html/components/gamemode-tabs'

const itemsPerPage = 8

function gamemodeFilter(gamemode: GamemodeTab) {
  return gamemode === 'all' ? {} : { gamemode }
}

export async function GameListPage(props: { page: number; gamemode: GamemodeTab }) {
  return (
    <Layout
      title={makeTitle('games')}
      description={`games - page ${props.page}`}
      canonical="/games"
      embedStyle={resolve(import.meta.dirname, 'game-list.css')}
    >
      <NavigationBar />
      <Page>
        <div class="container mx-auto">
          <div class="text-abru-light-75 my-9 text-[48px] font-bold">Games</div>
          <div class="mb-6">
            <GamemodeTabs
              active={props.gamemode}
              includeAll
              hxTarget="#gameList"
              hrefFn={tab => `/games?gamemode=${tab}`}
            />
          </div>
          <div class="contents" id="gameList">
            <GameList {...props} />
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

export async function GameList(props: { page: number; gamemode: GamemodeTab }) {
  const { page, gamemode } = props
  const filter = gamemodeFilter(gamemode)
  const { last, around } = paginate(
    page,
    itemsPerPage,
    await collections.games.countDocuments(filter),
  )
  const skip = (page - 1) * itemsPerPage

  const games = await collections.games
    .find<PickDeep<GameModel, 'number' | 'state' | 'events.0' | 'score' | 'map' | 'gamemode'>>(
      filter,
      {
        limit: itemsPerPage,
        skip,
        sort: { 'events.0.at': -1 },
        projection: {
          number: 1,
          state: 1,
          score: 1,
          map: 1,
          gamemode: 1,
          events: { $slice: 1 },
        },
      },
    )
    .toArray()

  return games.length > 0 ? (
    <>
      <div class="game-list" style="view-transition-name: game-list">
        {games.map(game => (
          <GameListItem game={game} showGamemode />
        ))}
      </div>
      <Pagination
        hrefFn={page => `/games?gamemode=${gamemode}&page=${page}`}
        lastPage={last}
        currentPage={page}
        around={around}
        hxTarget="#gameList"
      />
    </>
  ) : (
    <p class="text-abru-light-50">No games yet.</p>
  )
}
