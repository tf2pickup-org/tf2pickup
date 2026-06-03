import type { WithId } from 'mongodb'
import type {
  ActivityLogEntryModel,
  ActivityLogEntryType,
} from '../../../../database/models/activity-log-entry.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { Admin } from '../../../views/html/admin'
import { ActivityLogEntryList } from './activity-log-entry-list'

interface ActivityLogPageProps {
  logs: WithId<ActivityLogEntryModel>[]
  playerNames: Map<SteamId64, string>
  page: number
  totalCount: number
  sort: 'asc' | 'desc'
  type?: ActivityLogEntryType | undefined
  player?: string | undefined
}

const typeOptions: { value: ActivityLogEntryType; label: string }[] = [
  { value: 'player name change', label: 'Player name change' },
  { value: 'player skill change', label: 'Player skill change' },
  { value: 'configuration change', label: 'Configuration change' },
  { value: 'ban added', label: 'Ban added' },
  { value: 'ban revoked', label: 'Ban revoked' },
  { value: 'map pool change', label: 'Map pool change' },
  { value: 'map scramble', label: 'Map scramble' },
]

export function ActivityLogPage(props: ActivityLogPageProps) {
  return (
    <Admin activePage="activity-log">
      <div class="admin-panel-set">
        <div class="flex flex-wrap items-center gap-4 p-4">
          <input type="hidden" name="page" value="1" />

          <select
            name="type"
            hx-get="/admin/activity-log"
            hx-target="#activity-log-results"
            hx-include="[name='player'],[name='sort'],[name='page']"
            hx-push-url="true"
            class="border-abru-light-25 bg-abru-dark-6 text-abru-light-75 rounded border px-3 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {typeOptions.map(opt => (
              <option value={opt.value} selected={props.type === opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="player"
            value={props.player ?? ''}
            placeholder="Search player..."
            hx-get="/admin/activity-log"
            hx-target="#activity-log-results"
            hx-trigger="keyup changed delay:300ms"
            hx-include="[name='type'],[name='sort'],[name='page']"
            hx-push-url="true"
            class="border-abru-light-25 bg-abru-dark-6 text-abru-light-75 rounded border px-3 py-1.5 text-sm"
          />
        </div>

        <div id="activity-log-results">
          <ActivityLogEntryList {...props} />
        </div>
      </div>
    </Admin>
  )
}
