import type { PickDeep } from 'type-fest'
import { collections } from '../../../database/collections'
import type { GameModel } from '../../../database/models/game.model'
import type { PlayerModel } from '../../../database/models/player.model'
import { gameResult } from '../../../games/game-result'
import { GameListItem } from '../../../games/views/html/game-list-item'
import { GamesFilter } from '../../../games/views/html/games-filter'
import { Pagination, paginate } from '../../../html/components/pagination'
import { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { PlayerProfileLayout } from './player-profile-layout'

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
    <PlayerProfileLayout
      player={player}
      tab="Game History"
      safeToolbar={
        <GamesFilter
          baseUrl={`/players/${player.steamId}`}
          gamemodes={gamemodes}
          gamemode={props.gamemode}
          gameClasses={gameClasses}
          gameClass={props.gameClass}
        />
      }
    >
      <div id="gameList" class="contents">
        <PlayerGameList
          steamId={player.steamId}
          page={props.page}
          gamemode={props.gamemode}
          gameClass={props.gameClass}
        />
      </div>
    </PlayerProfileLayout>
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
