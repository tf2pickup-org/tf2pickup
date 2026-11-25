import { format, parseISO } from 'date-fns'
import { ActivityHeatmap } from '../../../html/components/activity-heatmap'
import { getGameLaunchesPerDay } from '../../get-game-launches-per-day'

export async function GameActivity() {
  const launches = await getGameLaunchesPerDay()
  const total = launches.reduce((sum, { count }) => sum + count, 0)
  const firstDay =
    launches.length > 0 ? parseISO(launches.map(({ day }) => day).sort()[0]!) : new Date()

  return (
    <div>
      <div class="mb-4 flex items-center gap-4">
        <h2 class="text-2xl leading-[1.5] font-bold">Game activity</h2>
        <span class="text-sm text-zinc-400">
          {total} games launched since <span safe>{format(firstDay, 'MMMM yyyy')}</span>
        </span>
      </div>

      <ActivityHeatmap
        counts={new Map(launches.map(({ day, count }) => [day, count]))}
        since={firstDay}
      />
    </div>
  )
}
