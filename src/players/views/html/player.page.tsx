import { collections } from '../../../database/collections'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { format } from 'date-fns'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { queue } from '../../../queue'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import {
  IconAlignBoxBottomRight,
  IconBrandSteam,
  IconBrandTwitch,
  IconClover,
  IconStars,
  IconSum,
} from '../../../html/components/icons'
import { resolve } from 'node:path'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { GameListItem } from '../../../games/views/html/game-list-item'
import { Pagination, paginate } from '../../../html/components/pagination'
import { makeTitle } from '../../../html/make-title'
import { environment } from '../../../environment'
import { AdminToolbox } from './admin-toolbox'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { players } from '../..'
import type { PickDeep } from 'type-fest'
import type { GameModel } from '../../../database/models/game.model'
import { requestContext } from '@fastify/request-context'

const gamesPerPage = 5

export async function PlayerPage(props: { steamId: SteamId64; page: number }) {
  const player = await players.bySteamId(props.steamId, [
    'steamId',
    'name',
    'joinedAt',
    'roles',
    'etf2lProfile',
    'twitchTvProfile',
    'avatar.large',
    'stats',
    'skill',
    'skillHistory',
    'verified',
  ])
  const user = requestContext.get('user')

  return (
    <Layout
      title={makeTitle(player.name)}
      description={`${player.name}'s profile on ${environment.WEBSITE_NAME}`}
      canonical={`/players/${player.steamId}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar />
      <Page>
        <div class="relative container mx-auto flex flex-col gap-[30px]">
          <PlayerPresentation
            player={player}
            gameCount={player.stats.totalGames}
            gameCountOnClasses={player.stats.gamesByClass}
            isAdmin={user?.player.roles.includes(PlayerRole.admin) ?? false}
          />

          {user?.player.roles.includes(PlayerRole.admin) && <AdminToolbox player={player} />}

          <div id="gameList" class="contents">
            <PlayerGameList steamId={player.steamId} page={props.page} />
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

export async function PlayerGameList(props: { steamId: SteamId64; page: number }) {
  const skip = (props.page - 1) * gamesPerPage
  const games = await collections.games
    .find<PickDeep<GameModel, 'number' | 'state' | 'events.0' | 'score' | 'map' | 'slots'>>(
      { 'slots.player': props.steamId },
      {
        limit: gamesPerPage,
        skip,
        sort: { 'events.0.at': -1 },
        projection: {
          number: 1,
          state: 1,
          events: { $slice: 1 },
          score: 1,
          map: 1,
          slots: 1,
        },
      },
    )
    .toArray()

  const { last, around } = paginate(
    props.page,
    gamesPerPage,
    await collections.games.countDocuments({ 'slots.player': props.steamId }),
  )

  return games.length > 0 ? (
    <>
      <div class="text-abru-light-75 text-center text-2xl font-bold md:text-start">
        Game history
      </div>
      <div class="game-list col-span-2">
        {games.map(game => (
          <GameListItem
            game={game}
            classPlayed={game.slots.find(s => s.player === props.steamId)!.gameClass}
          />
        ))}
      </div>

      <Pagination
        hrefFn={page => `/players/${props.steamId}?gamespage=${page}`}
        lastPage={last}
        currentPage={props.page}
        around={around}
        hxTarget="#gameList"
      />
    </>
  ) : (
    <div></div>
  )
}

function PlayerPresentation(props: {
  player: PickDeep<
    PlayerModel,
    | 'avatar.large'
    | 'name'
    | 'roles'
    | 'joinedAt'
    | 'etf2lProfile'
    | 'twitchTvProfile'
    | 'steamId'
    | 'skill'
  >
  gameCount: number
  gameCountOnClasses: Partial<Record<Tf2ClassName, number>>
  isAdmin: boolean
}) {
  return (
    <div class="player-presentation">
      <img
        src={props.player.avatar.large}
        width="184"
        height="184"
        class="player-avatar"
        alt={`${props.player.name}'s avatar`}
      />

      <div class="flex flex-row items-center gap-[10px]">
        <span class="-mt-[6px] text-[48px] leading-none font-bold" safe>
          {props.player.name}
        </span>
        {props.player.roles.includes(PlayerRole.admin) ? (
          <span class="bg-alert text-abru-light-3 rounded-[3px] px-[8px] py-[6px] leading-none font-bold">
            admin
          </span>
        ) : (
          <></>
        )}
        {props.isAdmin && props.player.skill === undefined && (
          <span class="flex items-center gap-1 rounded-[3px] bg-green-700 px-[8px] py-[6px] leading-none font-bold text-white">
            <IconClover size={14} />
            fresh
          </span>
        )}
      </div>

      <div class="flex-col md:justify-self-end">
        <div class="text-center text-base font-light md:text-start">Joined:</div>
        <div class="text-2xl font-bold" safe>
          {format(props.player.joinedAt, 'MMMM dd, yyyy')}
        </div>
      </div>

      <div class="player-stats">
        <span class="md:hidden">
          <IconSum size={32} />
        </span>
        <span class="hidden text-base font-light md:inline">Total games played:</span>
        <span class="justify-self-start text-2xl font-bold">{props.gameCount}</span>

        <div class="bg-abru-light-15 row-span-2 mx-2 hidden h-[48px] w-[2px] self-center md:block"></div>

        {queue.config.classes.map(({ name: gameClass }) => (
          <>
            <GameClassIcon gameClass={gameClass} size={32} />
            <span class="text-2xl font-bold">{props.gameCountOnClasses[gameClass] ?? 0}</span>
          </>
        ))}
      </div>

      <div class="grid gap-[10px] md:grid-flow-col md:grid-rows-1 md:justify-items-center md:max-xl:col-span-3 lg:place-content-end">
        <a
          href={`https://steamcommunity.com/profiles/${props.player.steamId}`}
          target="_blank"
          rel="noreferrer"
          class={['player-presentation-link', queue.config.classes.length > 4 && 'compact']}
          title="Steam"
        >
          <IconBrandSteam />
          <span>steam</span>
        </a>

        <a
          href={`https://logs.tf/profile/${props.player.steamId}`}
          target="_blank"
          rel="noreferrer"
          class={['player-presentation-link', queue.config.classes.length > 4 && 'compact']}
          title="Logs"
        >
          <IconAlignBoxBottomRight />
          <span>logs</span>
        </a>

        {props.player.etf2lProfile ? (
          <a
            href={`https://etf2l.org/forum/user/${props.player.etf2lProfile.id}`}
            target="_blank"
            rel="noreferrer"
            class={['player-presentation-link', queue.config.classes.length > 4 && 'compact']}
            title="ETF2L"
          >
            <IconStars />
            <span>etf2l</span>
          </a>
        ) : (
          <></>
        )}

        {props.player.twitchTvProfile ? (
          <a
            href={`https://www.twitch.tv/${props.player.twitchTvProfile.login}/`}
            target="_blank"
            rel="noreferrer"
            class={['player-presentation-link', queue.config.classes.length > 4 && 'compact']}
            title="Twitch"
          >
            <IconBrandTwitch />
            <span>twitch</span>
          </a>
        ) : (
          <></>
        )}
      </div>
    </div>
  )
}
