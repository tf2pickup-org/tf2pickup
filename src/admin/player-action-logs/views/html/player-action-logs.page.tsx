import type { PlayerActionEntryModel } from '../../../../database/models/player-action-entry.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { Admin } from '../../../views/html/admin'
import { LogEntryList } from './log-entry-list'

interface PlayerActionLogsPageProps {
  logs: PlayerActionEntryModel[]
  playerNames: Map<SteamId64, string>
  page: number
  totalCount: number
  sort: 'asc' | 'desc'
  action?: string | undefined
  player?: string | undefined
  ip?: string | undefined
}

export function PlayerActionLogsPage(props: PlayerActionLogsPageProps) {
  return (
    <Admin activePage="player-action-logs">
      <div class="admin-panel-set">
        <div class="flex items-center gap-4 p-4">
          <input type="hidden" name="page" value="1" />

          <select
            name="action"
            hx-get="/admin/player-action-logs"
            hx-target="#log-results"
            hx-include="[name='player'],[name='ip'],[name='sort'],[name='page']"
            class="border-abru-light-25 bg-abru-dark-6 text-abru-light-75 rounded border px-3 py-1.5 text-sm"
          >
            <option value="">All actions</option>
            <option value="went online" selected={props.action === 'went online'}>
              Went online
            </option>
            <option
              value="connected to gameserver"
              selected={props.action === 'connected to gameserver'}
            >
              Connected to gameserver
            </option>
            <option value="said" selected={props.action === 'said'}>
              Said (chat)
            </option>
          </select>

          <input
            type="text"
            name="player"
            value={props.player ?? ''}
            placeholder="Search player..."
            hx-get="/admin/player-action-logs"
            hx-target="#log-results"
            hx-trigger="keyup changed delay:300ms"
            hx-include="[name='action'],[name='ip'],[name='sort'],[name='page']"
            class="border-abru-light-25 bg-abru-dark-6 text-abru-light-75 rounded border px-3 py-1.5 text-sm"
          />

          <input
            type="text"
            name="ip"
            value={props.ip ?? ''}
            placeholder="Filter by IP..."
            hx-get="/admin/player-action-logs"
            hx-target="#log-results"
            hx-trigger="keyup changed delay:300ms"
            hx-include="[name='action'],[name='player'],[name='sort'],[name='page']"
            class="border-abru-light-25 bg-abru-dark-6 text-abru-light-75 rounded border px-3 py-1.5 text-sm"
          />
        </div>

        <div id="log-results">
          <LogEntryList
            logs={props.logs}
            playerNames={props.playerNames}
            page={props.page}
            totalCount={props.totalCount}
            sort={props.sort}
            action={props.action}
            player={props.player}
            ip={props.ip}
          />
        </div>
      </div>
    </Admin>
  )
}
