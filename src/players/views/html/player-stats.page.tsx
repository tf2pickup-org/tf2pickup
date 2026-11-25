import { startOfWeek, subYears } from 'date-fns'
import { gamemodeConfigs } from '../../../gamemodes/configs'
import { ActivityHeatmap } from '../../../html/components/activity-heatmap'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { Gamemode } from '../../../shared/types/gamemode'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { getGameLaunchesPerDay } from '../../../statistics/get-game-launches-per-day'
import { playerRecords, type GameRecord, type PlayerRecords } from '../../player-records'
import { PlayerProfileLayout } from './player-profile-layout'
import type { PlayerPageData } from './player.page'

const medicRecords = ['healing', 'hpm', 'ubers'] as const

const recordLabels: Record<keyof PlayerRecords, string> = {
  kills: 'Most kills',
  dpm: 'Highest DPM',
  damage: 'Highest damage',
  kd: 'Highest K/D',
  deaths: 'Most deaths',
  healing: 'Most healing',
  hpm: 'Highest HPM',
  ubers: 'Most ubers',
}

export async function PlayerStatsPage(props: {
  player: PlayerPageData
  gamemode?: Gamemode | undefined
}) {
  const { player } = props
  const gamesPlayed = Object.values(Gamemode)
    .map(gamemode => ({
      gamemode,
      count: Object.values(player.stats.gamesByClass[gamemode] ?? {}).reduce((a, b) => a + b, 0),
    }))
    .filter(({ count }) => count > 0)
  const gamemode = props.gamemode ?? gamesPlayed.toSorted((a, b) => b.count - a.count)[0]?.gamemode
  const since = startOfWeek(subYears(new Date(), 1))
  const launches = await getGameLaunchesPerDay(since, player.steamId)

  return (
    <PlayerProfileLayout player={player} tab="Stats">
      <section class="page-panel player-stats-section">
        <h2>General</h2>
        <div class="player-stats-columns">
          <div class="player-stats-card">
            <h3>Activity</h3>
            <ActivityHeatmap
              counts={new Map(launches.map(({ day, count }) => [day, count]))}
              since={since}
            />
          </div>

          <div class="player-stats-card">
            <div class="player-stats-card-header">
              <h3>Games played</h3>
              <span>Total: {player.stats.totalGames}</span>
            </div>
            <div class="player-stats-tiles">
              {gamesPlayed.map(({ gamemode, count }) => (
                <StatTile safeLabel={gamemode} value={count.toLocaleString('en')} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {gamemode && (
        <section class="page-panel player-stats-section">
          <div class="player-stats-section-header">
            <h2>By gamemode</h2>
            <nav class="profile-tabs" aria-label="Gamemode">
              {gamesPlayed.map(({ gamemode: g }) => (
                <a
                  href={`/players/${player.steamId}/stats?gamemode=${g}`}
                  class="profile-tab"
                  aria-current={g === gamemode ? 'page' : undefined}
                  data-umami-event="filter-player-stats"
                  data-umami-event-value={g}
                >
                  {g}
                </a>
              ))}
            </nav>
          </div>
          <GamemodeStats player={player} gamemode={gamemode} />
        </section>
      )}
    </PlayerProfileLayout>
  )
}

async function GamemodeStats(props: { player: PlayerPageData; gamemode: Gamemode }) {
  const classes = gamemodeConfigs[props.gamemode].classes.map(({ name }) => name)
  const gamesByClass = props.player.stats.gamesByClass[props.gamemode] ?? {}
  const records = await playerRecords(props.player.steamId, props.gamemode)
  const shownRecords = (Object.keys(recordLabels) as (keyof PlayerRecords)[]).filter(
    key =>
      classes.includes(Tf2ClassName.medic) ||
      !medicRecords.includes(key as (typeof medicRecords)[number]),
  )

  return (
    <div class="player-stats-columns">
      <div class="player-stats-card">
        <h3>Games by class</h3>
        <div class="player-stats-tiles">
          {classes.map(gameClass => (
            <StatTile
              safeLabel={
                <>
                  <GameClassIcon gameClass={gameClass} size={24} />
                  <span class="capitalize">{gameClass}</span>
                </>
              }
              value={(gamesByClass[gameClass] ?? 0).toLocaleString('en')}
            />
          ))}
        </div>
      </div>

      <div class="player-stats-records">
        {shownRecords.map(key => (
          <RecordTile label={recordLabels[key]} record={records[key]} />
        ))}
      </div>
    </div>
  )
}

function StatTile(props: { safeLabel: JSX.Element; value: string; href?: string | undefined }) {
  const { safeLabel } = props
  const content = (
    <>
      <span class="player-stats-tile-label">{safeLabel}</span>
      <span class="player-stats-tile-value" safe>
        {props.value}
      </span>
    </>
  )
  return props.href ? (
    <a href={props.href} class="player-stats-tile" title="Go to game">
      {content}
    </a>
  ) : (
    <div class="player-stats-tile">{content}</div>
  )
}

function RecordTile(props: {
  label: string
  record: (GameRecord & { kills?: number; deaths?: number }) | undefined
}) {
  const { record } = props
  if (!record) {
    return <StatTile safeLabel={props.label} value="—" />
  }

  const value =
    record.value === Infinity
      ? `∞ (${record.kills}/0)`
      : Number.isInteger(record.value) || record.value >= 100
        ? Math.round(record.value).toLocaleString('en')
        : record.value.toFixed(2)
  return <StatTile safeLabel={props.label} value={value} href={`/games/${record.gameNumber}`} />
}
