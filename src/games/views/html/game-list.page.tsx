import { resolve } from 'node:path'
import type { User } from '../../../auth/types/user'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Layout } from '../../../html/layout'
import { collections } from '../../../database/collections'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { GameListItem } from './game-list-item'
import { Pagination, paginate } from '../../../html/components/pagination'

const itemsPerPage = 8

export async function GameListPage(props: { user?: User | undefined; page: number }) {
  const page = props.page ?? 1
  const { last, around } = paginate(page, itemsPerPage, await collections.games.countDocuments())
  const skip = (page - 1) * itemsPerPage

  const games = await collections.games
    .find({}, { limit: itemsPerPage, skip, sort: { 'events.0.at': -1 } })
    .toArray()

  return (
    <Layout title="games" embedStyle={resolve(import.meta.dirname, 'game-list.css')}>
      <NavigationBar user={props.user} currentPage="/games" />
      <Page>
        <div class="container mx-auto">
          <div class="my-9 text-[48px] font-bold text-abru-light-75">Games</div>

          <div class="game-list">
            {games.map(game => (
              <GameListItem game={game} />
            ))}
          </div>
          <Pagination
            hrefFn={page => `/games?page=${page}`}
            lastPage={last}
            currentPage={page}
            around={around}
          />
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
