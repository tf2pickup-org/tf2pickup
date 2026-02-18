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
  IconAwardFilled,
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

          <div class="player-content-columns">
            <div class="player-content-left">
              <PlayerAchievements />
            </div>

            <div class="player-content-right" id="gameList">
              <PlayerGameList steamId={player.steamId} page={props.page} />
            </div>
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
      <div class="game-list">
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

// ── MOCKUP: Achievement data & component (fake data for visual preview) ──

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'australium'

interface MockAchievement {
  name: string
  description: string
  tier: AchievementTier
  unlocked: boolean
  unlockedAt?: string
  progress?: { current: number; target: number }
}

const tierColors: Record<AchievementTier, string> = {
  bronze: '#cd7f32',
  silver: '#bbbbbb',
  gold: '#e3c392',
  australium: '#e3b63a',
}

const mockAchievements: MockAchievement[] = [
  { name: 'First Blood', description: 'Play your first game', tier: 'bronze', unlocked: true, unlockedAt: 'Jan 15, 2025' },
  { name: 'Mercenary', description: 'Play 100 games', tier: 'bronze', unlocked: true, unlockedAt: 'Mar 22, 2025' },
  { name: 'Ze Healing Is Not As Rewarding As Ze Hurting', description: 'Play 100 games as medic', tier: 'bronze', unlocked: true, unlockedAt: 'May 10, 2025' },
  { name: 'Reinforcements Have Arrived', description: 'Join a game as a substitute', tier: 'bronze', unlocked: true, unlockedAt: 'Feb 3, 2025' },
  { name: 'Top Damage Dealer', description: 'Have the highest DPM in a game 10 times', tier: 'bronze', unlocked: true, unlockedAt: 'Apr 8, 2025' },
  { name: 'Quick-Fix', description: 'Heal more than 1200 HPM in a game', tier: 'bronze', unlocked: true, unlockedAt: 'Jun 1, 2025' },
  { name: 'Grizzled Veteran', description: 'Play 250 games', tier: 'silver', unlocked: true, unlockedAt: 'Jul 14, 2025' },
  { name: 'Übermensch', description: 'Play 500 games as medic', tier: 'silver', unlocked: true, unlockedAt: 'Nov 2, 2025' },
  { name: 'Iron Mann', description: 'Complete 10 games without disconnecting', tier: 'silver', unlocked: true, unlockedAt: 'Feb 28, 2025' },
  { name: 'Need A Dispenser Here', description: 'Join the server within 1 min 50 times', tier: 'silver', unlocked: true, unlockedAt: 'Sep 5, 2025' },
  { name: 'F2P No More', description: 'Play 1000 games', tier: 'gold', unlocked: true, unlockedAt: 'Dec 20, 2025' },
  { name: 'Mann of Steel', description: 'Complete 50 games without disconnecting', tier: 'gold', unlocked: false, progress: { current: 30, target: 50 } },
  { name: 'Pain Train', description: 'Have the highest DPM in a game 100 times', tier: 'silver', unlocked: false, progress: { current: 42, target: 100 } },
  { name: 'Miracle Worker', description: 'Heal more than 1200 HPM in 10 games', tier: 'silver', unlocked: false, progress: { current: 7, target: 10 } },
  { name: 'Australium Legend', description: 'Play 5000 games', tier: 'australium', unlocked: false, progress: { current: 1100, target: 5000 } },
  { name: 'Australium Rocket Launcher', description: 'Have the highest DPM 1000 times', tier: 'australium', unlocked: false, progress: { current: 42, target: 1000 } },
  { name: 'Mannpower Medic', description: 'Heal more than 1200 HPM in 100 games', tier: 'australium', unlocked: false, progress: { current: 7, target: 100 } },
]

function AchievementBadge(props: { achievement: MockAchievement }) {
  const { achievement: a } = props
  const color = tierColors[a.tier]
  const progressPct = a.progress ? Math.round((a.progress.current / a.progress.target) * 100) : 0

  return (
    <div class={['achievement-badge', `tier-${a.tier}`, !a.unlocked && 'locked']}>
      <div class="achievement-icon">
        <IconAwardFilled size={28} />
      </div>
      <div class="achievement-name" safe>{a.name}</div>
      <div class="achievement-tier" style={`color: ${color}`}>
        {a.tier}
      </div>
      {!a.unlocked && a.progress && (
        <div class="achievement-progress">
          <div
            class="achievement-progress-bar"
            style={`width: ${String(progressPct)}%; background-color: ${color}`}
          ></div>
        </div>
      )}
      <div class="tooltip">
        <div class="tooltip-desc" safe>{a.description}</div>
        <div class="tooltip-date" safe>
          {a.unlocked ? `Unlocked ${a.unlockedAt}` : `${String(a.progress?.current ?? 0)} / ${String(a.progress?.target ?? '?')}`}
        </div>
      </div>
    </div>
  )
}

function PlayerAchievements() {
  const unlocked = mockAchievements.filter(a => a.unlocked)
  const locked = mockAchievements.filter(a => !a.unlocked)

  return (
    <>
      <div class="text-abru-light-75 text-center text-2xl font-bold md:text-start">
        Achievements
        <span class="text-abru-light-50 text-base font-normal ml-2">
          {unlocked.length}/{mockAchievements.length}
        </span>
      </div>
      <div class="achievements-scroll" data-fade-scroll>
        <div class="achievements-grid">
          {unlocked.map(a => (
            <AchievementBadge achievement={a} />
          ))}
        </div>
      </div>
      {locked.length > 0 && (
        <details class="achievements-locked-group">
          <summary class="achievements-locked-toggle">
            <span>{locked.length} locked achievement{locked.length !== 1 ? 's' : ''}</span>
          </summary>
          <div class="achievements-grid mt-3">
            {locked.map(a => (
              <AchievementBadge achievement={a} />
            ))}
          </div>
        </details>
      )}
    </>
  )
}
