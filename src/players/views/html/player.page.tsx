import { collections } from '../../../database/collections'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { playerAvatarUrl } from '../../../shared/player-avatar-url'
import { format } from 'date-fns'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { Gamemode } from '../../../shared/types/gamemode'
import { getQueueConfig } from '../../../queue-auto/configs'
import { GamemodeTabs, type GamemodeTab } from '../../../html/components/gamemode-tabs'
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
import type { PickDeep } from 'type-fest'
import type { GameModel } from '../../../database/models/game.model'
import { requestContext } from '@fastify/request-context'

const gamesPerPage = 5

export type PlayerPageData = PickDeep<
  PlayerModel,
  | 'steamId'
  | 'name'
  | 'joinedAt'
  | 'roles'
  | 'etf2lProfile'
  | 'twitchTvProfile'
  | 'avatar.large'
  | 'stats'
  | 'skill'
  | 'skillHistory'
  | 'verified'
  | 'bans'
  | 'elo'
>

export async function PlayerPage(props: {
  player: PlayerPageData
  page: number
  gamemode: Gamemode
  gamesGamemode: GamemodeTab
}) {
  const { player, gamemode } = props
  const user = requestContext.get('user')

  return (
    <Layout
      title={makeTitle(player.name)}
      description={`${player.name} · ${player.stats.totalGames} games played on ${environment.WEBSITE_NAME} · member since ${format(player.joinedAt, 'MMMM yyyy')}`}
      image={`/players/${player.steamId}/og-image.png`}
      canonical={`/players/${player.steamId}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar />
      <Page>
        <div class="relative container mx-auto flex flex-col gap-[30px]">
          <div>
            <GamemodeTabs
              active={gamemode}
              hrefFn={tab => `/players/${player.steamId}?gamemode=${tab}`}
            />
          </div>

          <PlayerPresentation
            player={player}
            gamemode={gamemode}
            gameCount={player.stats.totalGames}
            gameCountOnClasses={player.stats.gamesByClass[gamemode] ?? {}}
            isAdmin={user?.player.roles.includes(PlayerRole.admin) ?? false}
          />

          {user?.player.roles.includes(PlayerRole.admin) && (
            <AdminToolbox player={player} gamemode={gamemode} />
          )}

          <div id="gameList" class="contents">
            <PlayerGameList
              steamId={player.steamId}
              page={props.page}
              gamemode={props.gamesGamemode}
            />
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

export async function PlayerGameList(props: {
  steamId: SteamId64
  page: number
  gamemode: GamemodeTab
}) {
  const { gamemode } = props
  const filter = {
    'slots.player': props.steamId,
    ...(gamemode === 'all' ? {} : { gamemode }),
  }
  const skip = (props.page - 1) * gamesPerPage
  const games = await collections.games
    .find<PickDeep<GameModel, 'number' | 'state' | 'events.0' | 'score' | 'map' | 'slots'>>(
      filter,
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
    await collections.games.countDocuments(filter),
  )

  if (games.length === 0 && gamemode === 'all') {
    return <div></div>
  }

  return (
    <>
      <div class="flex flex-row flex-wrap items-center justify-between gap-2">
        <div class="text-abru-light-75 text-center text-2xl font-bold md:text-start">
          Game history
        </div>
        <GamemodeTabs
          active={gamemode}
          includeAll
          hxTarget="#gameList"
          hrefFn={tab => `/players/${props.steamId}?gamesgamemode=${tab}`}
        />
      </div>
      {games.length > 0 ? (
        <div class="game-list col-span-2" style="view-transition-name: player-game-list">
          {games.map(game => (
            <GameListItem
              game={game}
              classPlayed={game.slots.find(s => s.player === props.steamId)!.gameClass}
            />
          ))}
        </div>
      ) : (
        <p class="text-abru-light-50">No games yet.</p>
      )}

      <Pagination
        hrefFn={page => `/players/${props.steamId}?gamesgamemode=${gamemode}&gamespage=${page}`}
        lastPage={last}
        currentPage={props.page}
        around={around}
        hxTarget="#gameList"
      />
    </>
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
  gamemode: Gamemode
  gameCount: number
  gameCountOnClasses: Partial<Record<Tf2ClassName, number>>
  isAdmin: boolean
}) {
  const config = getQueueConfig(props.gamemode)
  return (
    <div class="player-presentation">
      <img
        src={playerAvatarUrl(props.player.avatar, 'large')}
        width="184"
        height="184"
        class="player-avatar"
        alt={`${props.player.name}'s avatar`}
        fetchpriority="high"
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
        {props.isAdmin && props.player.skill?.[props.gamemode] === undefined && (
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

        {config.classes.map(({ name: gameClass }) => (
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
          class={['player-presentation-link', config.classes.length > 4 && 'compact']}
          title="Steam"
          data-umami-event="open-external-profile"
          data-umami-event-target="steam"
        >
          <IconBrandSteam />
          <span>steam</span>
        </a>

        <a
          href={`https://logs.tf/profile/${props.player.steamId}`}
          target="_blank"
          rel="noreferrer"
          class={['player-presentation-link', config.classes.length > 4 && 'compact']}
          title="Logs"
          data-umami-event="open-external-profile"
          data-umami-event-target="logs"
        >
          <IconAlignBoxBottomRight />
          <span>logs</span>
        </a>

        {props.player.etf2lProfile ? (
          <a
            href={`https://etf2l.org/forum/user/${props.player.etf2lProfile.id}`}
            target="_blank"
            rel="noreferrer"
            class={['player-presentation-link', config.classes.length > 4 && 'compact']}
            title="ETF2L"
            data-umami-event="open-external-profile"
            data-umami-event-target="etf2l"
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
            class={['player-presentation-link', config.classes.length > 4 && 'compact']}
            title="Twitch"
            data-umami-event="open-external-profile"
            data-umami-event-target="twitch"
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
