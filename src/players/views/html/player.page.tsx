import { collections } from '../../../database/collections'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { format } from 'date-fns'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import {
  IconAlignBoxBottomRight,
  IconBrandSteam,
  IconBrandTwitch,
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
  ])
  const user = requestContext.get('user')
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

  return (
    <Layout
      title={makeTitle(player.name)}
      description={`${player.name}'s profile on ${environment.WEBSITE_NAME}`}
      canonical={`/players/${player.steamId}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar />
      <Page>
        <div class="container relative mx-auto flex flex-col gap-[30px]">
          <PlayerPresentation
            player={player}
            gameCount={player.stats.totalGames}
            gameCountOnClasses={player.stats.gamesByClass}
          />

          {user?.player.roles.includes(PlayerRole.admin) && <AdminToolbox player={player} />}

          {games.length > 0 ? (
            <>
              <div class="text-center text-2xl font-bold text-abru-light-75 md:text-start">
                Game history
              </div>
              <div class="game-list col-span-2">
                {games.map(game => (
                  <GameListItem
                    game={game}
                    classPlayed={game.slots.find(s => s.player === player.steamId)!.gameClass}
                  />
                ))}
              </div>

              <Pagination
                hrefFn={page => `/players/${player.steamId}?gamespage=${page}`}
                lastPage={last}
                currentPage={props.page}
                around={around}
              />
            </>
          ) : (
            <div></div>
          )}
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

function PlayerPresentation(props: {
  player: PickDeep<
    PlayerModel,
    'avatar.large' | 'name' | 'roles' | 'joinedAt' | 'etf2lProfile' | 'twitchTvProfile' | 'steamId'
  >
  gameCount: number
  gameCountOnClasses: Partial<Record<Tf2ClassName, number>>
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
        <span class="-mt-[6px] text-[48px] font-bold leading-none" safe>
          {props.player.name}
        </span>
        {props.player.roles.includes(PlayerRole.admin) ? (
          <span class="rounded-[3px] bg-alert px-[8px] py-[6px] font-bold leading-none text-abru-light-3">
            admin
          </span>
        ) : (
          <></>
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

        <div class="row-span-2 mx-2 hidden h-[48px] w-[2px] self-center bg-abru-light-15 md:block"></div>

        {[Tf2ClassName.scout, Tf2ClassName.soldier, Tf2ClassName.demoman, Tf2ClassName.medic].map(
          gameClass => (
            <>
              <GameClassIcon gameClass={gameClass} size={32} />
              <span class="text-2xl font-bold">{props.gameCountOnClasses[gameClass] ?? 0}</span>
            </>
          ),
        )}
      </div>

      <div class="grid gap-[10px] md:grid-flow-col md:grid-rows-1 md:justify-items-center md:max-xl:col-span-3 lg:place-content-end">
        <a
          href={`https://steamcommunity.com/profiles/${props.player.steamId}`}
          target="_blank"
          rel="noreferrer"
          class="player-presentation-link"
        >
          <IconBrandSteam />
          <span>steam</span>
        </a>

        <a
          href={`https://logs.tf/profile/${props.player.steamId}`}
          target="_blank"
          rel="noreferrer"
          class="player-presentation-link"
        >
          <IconAlignBoxBottomRight />
          <span>logs</span>
        </a>

        {props.player.etf2lProfile ? (
          <a
            href={`https://etf2l.org/forum/user/${props.player.etf2lProfile.id}`}
            target="_blank"
            rel="noreferrer"
            class="player-presentation-link"
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
            class="player-presentation-link"
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
