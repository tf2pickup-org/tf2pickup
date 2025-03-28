import type { User } from '../../../auth/types/user'
import { collections } from '../../../database/collections'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { format } from 'date-fns'
import { GameState } from '../../../database/models/game.model'
import { getPlayerGameCountOnClasses } from '../../get-player-game-count-on-classes'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import {
  IconAlignBoxBottomRight,
  IconBrandSteam,
  IconBrandTwitch,
  IconEdit,
  IconStars,
  IconSum,
} from '../../../html/components/icons'
import { resolve } from 'node:path'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { GameListItem } from '../../../games/views/html/game-list-item'
import { Pagination, paginate } from '../../../html/components/pagination'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { makeTitle } from '../../../html/make-title'
import { environment } from '../../../environment'

const gamesPerPage = 5

export async function PlayerPage(props: {
  player: PlayerModel
  user?: User | undefined
  page: number
}) {
  const skip = (props.page - 1) * gamesPerPage

  const games = await collections.games
    .find(
      { 'slots.player': props.player.steamId },
      { limit: gamesPerPage, skip, sort: { 'events.0.at': -1 } },
    )
    .toArray()

  const { last, around } = paginate(
    props.page,
    gamesPerPage,
    await collections.games.countDocuments({ 'slots.player': props.player.steamId }),
  )

  const gameCount = await collections.games.countDocuments({
    $and: [{ state: GameState.ended }, { ['slots.player']: props.player.steamId }],
  })

  const gameCountOnClasses = await getPlayerGameCountOnClasses(props.player.steamId)

  return (
    <Layout
      user={props.user}
      title={makeTitle(props.player.name)}
      description={`${props.player.name}'s profile on ${environment.WEBSITE_NAME}`}
      canonical={`/players/${props.player.steamId}`}
      embedStyle={resolve(import.meta.dirname, 'style.css')}
    >
      <NavigationBar user={props.user} />
      <Page>
        <div class="container relative mx-auto grid grid-cols-2 gap-[30px]">
          <div class="col-span-2">
            <PlayerPresentation
              player={props.player}
              gameCount={gameCount}
              gameCountOnClasses={gameCountOnClasses}
            />
          </div>

          {games.length > 0 ? (
            <>
              <div class="col-span-2 text-center text-2xl font-bold text-abru-light-75 md:text-start">
                Game history
              </div>
              <div class="game-list col-span-2">
                {games.map(game => (
                  <GameListItem
                    game={game}
                    classPlayed={game.slots.find(s => s.player === props.player.steamId)!.gameClass}
                  />
                ))}
              </div>

              <Pagination
                hrefFn={page => `/players/${props.player.steamId}?gamespage=${page}`}
                lastPage={last}
                currentPage={props.page}
                around={around}
              />
            </>
          ) : (
            <>
              <div></div>
            </>
          )}
          <EditPlayerButton user={props.user} steamId={props.player.steamId} />
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}

function PlayerPresentation(props: {
  player: PlayerModel
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

        {props.player.etf2lProfileId ? (
          <a
            href={`https://etf2l.org/forum/user/${props.player.etf2lProfileId}`}
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

function EditPlayerButton(props: { user: User | undefined; steamId: SteamId64 }) {
  return (
    <div class="grid justify-items-end">
      {props.user?.player.roles.includes(PlayerRole.admin) ? (
        <a href={`/players/${props.steamId}/edit`} class="button button--accent drop-shadow">
          <span class="sr-only">Edit player</span>
          <IconEdit />
        </a>
      ) : (
        <></>
      )}
    </div>
  )
}
