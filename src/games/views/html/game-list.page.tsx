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
import type { Gamemode } from '../../../shared/types/gamemode'
import { GamesFilter } from './games-filter'

const itemsPerPage = 8

export async function GameListPage(props: { page: number; gamemode?: Gamemode | undefined }) {
  return (
    <Layout
      title={makeTitle('games')}
      description={`games - page ${props.page}`}
      canonical="/games"
      embedStyle={resolve(import.meta.dirname, 'game-list.css')}
    >
      <NavigationBar wide />
      <Page>
        <div class="games-page">
          <div class="games-page-header">
            <h1 class="games-page-title">Games</h1>
            <GamesFilter gamemode={props.gamemode} />
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

export async function GameList(props: { page: number; gamemode?: Gamemode | undefined }) {
  const { page, gamemode } = props
  const filter = gamemode ? { gamemode } : {}
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
          <GameListItem game={game} />
        ))}
      </div>
      <Pagination
        hrefFn={page => `/games?${new URLSearchParams({ page: String(page), ...filter })}`}
        lastPage={last}
        currentPage={page}
        around={around}
        hxTarget="#gameList"
      />
    </>
  ) : (
    <p class="text-zinc-400">No games yet.</p>
  )
}
