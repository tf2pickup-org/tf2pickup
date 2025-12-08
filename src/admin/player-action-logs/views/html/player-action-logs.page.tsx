import { Admin } from '../../../views/html/admin'
import { getLogs } from '../../get-logs'
import { LogEntryList } from './log-entry-list'

export async function PlayerActionLogsPage() {
  return (
    <Admin activePage="player-action-logs">
      <div class="admin-panel-set max-h-[750px] overflow-y-scroll">
        <table class="w-full text-left text-sm rtl:text-right">
          <thead>
            <tr>
              <th class="px-4 py-2">Date</th>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">SteamId</th>
              <th class="px-4 py-2">IP</th>
              <th class="px-4 py-2">User agent</th>
              <th class="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <LogEntryList logs={await getLogs()} />
          </tbody>
        </table>
      </div>
    </Admin>
  )
}
