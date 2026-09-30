import Html from '@kitajs/html'
import { requestContext } from '@fastify/request-context'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { resolve } from 'node:path'
import type { PickDeep } from 'type-fest'
import { collections } from '../../../database/collections'
import type { GameModel } from '../../../database/models/game.model'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { environment } from '../../../environment'
import { gameResult } from '../../../games/game-result'
import { GameListItem } from '../../../games/views/html/game-list-item'
import { GamesFilter } from '../../../games/views/html/games-filter'
import { Footer } from '../../../html/components/footer'
import {
  IconAlignBoxBottomRight,
  IconBrandSteam,
  IconBrandTwitch,
  IconStars,
} from '../../../html/components/icons'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Pagination, paginate } from '../../../html/components/pagination'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'
import { playerAvatarUrl } from '../../../shared/player-avatar-url'
import { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { AdminToolbox } from './admin-toolbox'

const gamesPerPage = 9

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
  | 'chatMutes'
  | 'elo'
>

export async function PlayerPage(props: {
  player: PlayerPageData
  page: number
  gamemode?: Gamemode | undefined
  gameClass?: Tf2ClassName | undefined
}) {
  const { player } = props
  const user = requestContext.get('user')
  const gamesByClass = player.stats.gamesByClass
  const gamemodes = Object.values(Gamemode).filter(
    gamemode => Object.keys(gamesByClass[gamemode] ?? {}).length > 0,
  )
  const gameClasses = Object.values(Tf2ClassName).filter(gameClass =>
    (props.gamemode ? [props.gamemode] : gamemodes).some(
      gamemode => (gamesByClass[gamemode]?.[gameClass] ?? 0) > 0,
    ),
  )

  return (
    <Layout
      title={makeTitle(player.name)}
      description={`${player.name} · ${player.stats.totalGames} games played on ${environment.WEBSITE_NAME} · member since ${format(player.joinedAt, 'MMMM yyyy')}`}
      image={`/players/${player.steamId}/og-image.png`}
      canonical={`/players/${player.steamId}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar wide />
      <Page>
        <div class="player-page">
          <ProfileCard player={player} />

          <div class="player-page-main">
            <div class="player-page-toolbar">
              <nav class="profile-tabs" aria-label="Profile">
                <a href={`/players/${player.steamId}`} class="profile-tab" aria-current="page">
                  Game History
                </a>
              </nav>
              <GamesFilter
                baseUrl={`/players/${player.steamId}`}
                gamemodes={gamemodes}
                gamemode={props.gamemode}
                gameClasses={gameClasses}
                gameClass={props.gameClass}
              />
            </div>

            <div id="gameList" class="contents">
              <PlayerGameList
                steamId={player.steamId}
                page={props.page}
                gamemode={props.gamemode}
                gameClass={props.gameClass}
              />
            </div>
          </div>

          {user?.player.roles.includes(PlayerRole.admin) && <AdminToolbox player={player} />}
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

export async function PlayerGameList(props: {
  steamId: SteamId64
  page: number
  gamemode?: Gamemode | undefined
  gameClass?: Tf2ClassName | undefined
}) {
  const { steamId, gamemode, gameClass } = props
  const skip = (props.page - 1) * gamesPerPage
  const filter = {
    slots: { $elemMatch: { player: steamId, ...(gameClass && { gameClass }) } },
    ...(gamemode && { gamemode }),
  }
  const games = await collections.games
    .find<
      PickDeep<GameModel, 'number' | 'state' | 'events.0' | 'score' | 'map' | 'gamemode' | 'slots'>
    >(filter, {
      limit: gamesPerPage,
      skip,
      sort: { 'events.0.at': -1 },
      projection: {
        number: 1,
        state: 1,
        events: { $slice: 1 },
        score: 1,
        map: 1,
        gamemode: 1,
        slots: 1,
      },
    })
    .toArray()

  const { last, around } = paginate(
    props.page,
    gamesPerPage,
    await collections.games.countDocuments(filter),
  )

  const query = (page: number) =>
    new URLSearchParams({
      gamespage: String(page),
      ...(gamemode && { gamemode }),
      ...(gameClass && { gameClass }),
    })

  return games.length > 0 ? (
    <>
      <div class="game-list player-game-list" style="view-transition-name: player-game-list">
        {games.map(game => (
          <GameListItem
            game={game}
            classPlayed={game.slots.find(s => s.player === steamId)!.gameClass}
            result={gameResult(game, steamId)}
          />
        ))}
      </div>

      <Pagination
        hrefFn={page => `/players/${steamId}?${query(page)}`}
        lastPage={last}
        currentPage={props.page}
        around={around}
        hxTarget="#gameList"
      />
    </>
  ) : (
    <p class="text-zinc-400">No games yet.</p>
  )
}

function ProfileCard(props: {
  player: PickDeep<
    PlayerModel,
    | 'avatar.large'
    | 'name'
    | 'joinedAt'
    | 'etf2lProfile'
    | 'twitchTvProfile'
    | 'steamId'
    | 'stats.totalGames'
  >
}) {
  const { player } = props
  return (
    <div class="profile-card">
      <img
        src={playerAvatarUrl(player.avatar, 'large')}
        width="130"
        height="130"
        class="profile-avatar"
        alt={`${player.name}'s avatar`}
        fetchpriority="high"
      />

      <div class="profile-facts">
        <div>
          <span class="profile-fact-label">Joined</span>
          <span class="profile-fact-value" title={format(player.joinedAt, 'MMMM dd, yyyy')} safe>
            {formatDistanceToNowStrict(player.joinedAt, { addSuffix: true })}
          </span>
        </div>
        <div>
          <span class="profile-fact-label">Total games played:</span>
          <span class="profile-fact-value">{player.stats.totalGames}</span>
        </div>
      </div>

      <h1 class="profile-name" safe>
        {player.name}
      </h1>

      <div class="profile-links">
        {player.twitchTvProfile ? (
          <ProfileLink
            href={`https://www.twitch.tv/${player.twitchTvProfile.login}/`}
            target="twitch"
          >
            <IconBrandTwitch />
            <span>Twitch.tv</span>
          </ProfileLink>
        ) : (
          <></>
        )}
        {player.etf2lProfile ? (
          <ProfileLink
            href={`https://etf2l.org/forum/user/${player.etf2lProfile.id}`}
            target="etf2l"
          >
            <IconStars />
            <span>ETF2L</span>
          </ProfileLink>
        ) : (
          <></>
        )}
        <ProfileLink href={`https://steamcommunity.com/profiles/${player.steamId}`} target="steam">
          <IconBrandSteam />
          <span>Steam</span>
        </ProfileLink>
        <ProfileLink href={`https://logs.tf/profile/${player.steamId}`} target="logs">
          <IconAlignBoxBottomRight />
          <span>Logs.tf</span>
        </ProfileLink>
      </div>
    </div>
  )
}

function ProfileLink(props: Html.PropsWithChildren<{ href: string; target: string }>) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noreferrer"
      class="profile-link"
      data-umami-event="open-external-profile"
      data-umami-event-target={props.target}
    >
      {props.children}
    </a>
  )
}
