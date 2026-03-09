import { collections } from '../../../database/collections'
import { GameState } from '../../../database/models/game.model'

export async function GlobalStats() {
  const [totalGames, playersWithGames, statsDoc] = await Promise.all([
    collections.games.countDocuments({ state: GameState.ended }),
    collections.players.countDocuments({ 'stats.totalGames': { $gt: 0 } }),
    collections.stats.findOne({ _id: 'total' }),
  ])

  const totalHours = Math.floor((statsDoc?.totalDurationMs ?? 0) / 3_600_000)

  return (
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
      <StatCard value={totalGames.toLocaleString('en')} label="games played" />
      <StatCard value={playersWithGames.toLocaleString('en')} label="players" />
      <StatCard value={`${totalHours.toLocaleString('en')}h`} label="total game time" />
    </div>
  )
}

function StatCard(props: { value: string; label: string }) {
  return (
    <div class="bg-abru-dark-25 flex flex-col gap-1 rounded-lg px-6 py-8">
      <span safe class="text-abru-light-75 text-[40px] leading-none font-bold">
        {props.value}
      </span>
      <span safe class="text-abru-light-50 text-sm tracking-wide uppercase">
        {props.label}
      </span>
    </div>
  )
}
