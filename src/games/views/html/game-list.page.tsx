import { resolve } from 'node:path'
import type { User } from '../../../auth/types/user'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Style } from '../../../html/components/style'
import { Layout } from '../../../html/layout'
import { collections } from '../../../database/collections'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { format } from 'date-fns'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import { IconChevronLeft, IconChevronRight } from '../../../html/components/icons'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'

const itemsPerPage = 8

export async function GameListPage(user?: User, page = 1) {
  const { last, around } = paginate(page, itemsPerPage, await collections.games.countDocuments())
  const skip = (page - 1) * itemsPerPage

  const games = await collections.games
    .find({}, { limit: itemsPerPage, skip, sort: { 'events.0.at': -1 } })
    .toArray()

  return (
    <Layout title="games" head={<Style fileName={resolve(import.meta.dirname, 'style.css')} />}>
      <NavigationBar user={user} />
      <Page>
        <div class="container mx-auto">
          <div class="text-abru-light-75 my-9 text-[48px] font-bold">Games</div>

          <div class="game-list">
            {games.map(game => (
              <GameListItem game={game} />
            ))}
          </div>
          <Pagination lastPage={last} currentPage={page} around={around} />
        </div>
      </Page>
      <Footer user={user} />
    </Layout>
  )
}

export interface Paginated {
  last: number
  around: number[]
}

const range = 2

export const paginate = (
  currentPage: number,
  itemsPerPage: number,
  itemCount: number,
): Paginated => {
  const links: number[] = []
  const last = Math.ceil(itemCount / itemsPerPage)

  let from = Math.max(currentPage - range, 1)
  const to = Math.min(from + range * 2, last)
  from = Math.max(to - range * 2, 1)

  for (let i = from; i <= to; ++i) {
    links.push(i)
  }

  return {
    last,
    around: links,
  }
}

function GameListItem(props: { game: GameModel; classPlayed?: Tf2ClassName }) {
  const isRunning = [
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(props.game.state)

  const launchedAt = props.game.events[0]?.at
  if (!launchedAt) throw new Error('game has no events')

  let gameLabel = <div class="col-span-2"></div>
  if (props.game.state === GameState.interrupted) {
    gameLabel = <div class="label label--interrupted">force-ended</div>
  } else if (props.game.score?.blu !== undefined) {
    gameLabel = (
      <>
        <div class="label label--blu">blu: {props.game.score.blu}</div>
        <div class="label label--red">red: {props.game.score.red}</div>
      </>
    )
  } else if (
    [GameState.created, GameState.configuring, GameState.launching].includes(props.game.state)
  ) {
    gameLabel = <div class="label label--launching">{props.game.state}</div>
  }

  return (
    <a class="game-list-item" href={`/games/${props.game.number}`}>
      <div class="live-indicator">{isRunning ? <GameLiveIndicator /> : <></>}</div>
      <span class={['game-number', isRunning && 'text-accent']}>#{props.game.number}</span>
      <span class="map-name" safe>
        {props.game.map}
      </span>
      <span class="launched-at" safe>
        {format(launchedAt, 'dd.MM.yyyy HH:mm')}
      </span>

      <div class="game-class-icon">
        {props.classPlayed && <GameClassIcon gameClass={props.classPlayed} />}
      </div>

      {gameLabel}

      <div class="absolute bottom-0 left-0 right-0 top-0 -z-10 overflow-hidden rounded-lg xl:left-1/3">
        <MapThumbnail map={props.game.map} />
      </div>
    </a>
  )
}

function Pagination(props: { lastPage: number; currentPage: number; around: number[] }) {
  return (
    <div class="flex h-12 flex-row flex-nowrap items-center gap-2 text-lg text-white">
      <a
        href={`/games?page=${props.currentPage - 1}`}
        class={['page', props.currentPage <= 1 && 'page--disabled']}
      >
        <IconChevronLeft />
      </a>

      {props.around.map(page => (
        <a
          href={`/games?page=${page}`}
          class={['page', props.currentPage === page && 'page--active']}
        >
          <span class="px-[10px]">{page}</span>
        </a>
      ))}

      <a
        href={`/games?page=${props.currentPage + 1}`}
        class={['page', props.currentPage >= props.lastPage && 'page--disabled']}
      >
        <IconChevronRight />
      </a>
    </div>
  )
}
