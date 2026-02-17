import type { PlayerActionEntryModel } from '../../../../database/models/player-action-entry.model'
import { paginate, Pagination } from '../../../../html/components/pagination'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { logsPerPage } from '../../get-logs'

interface LogEntryListProps {
  logs: PlayerActionEntryModel[]
  playerNames: Map<SteamId64, string>
  page: number
  totalCount: number
  sort: 'asc' | 'desc'
  action?: string | undefined
  player?: string | undefined
  ip?: string | undefined
}

export function LogEntryList(props: LogEntryListProps) {
  const { last, around } = paginate(props.page, logsPerPage, props.totalCount)
  const oppositeSort = props.sort === 'asc' ? 'desc' : 'asc'
  const sortIndicator = props.sort === 'asc' ? ' \u2191' : ' \u2193'

  return (
    <>
      <table class="w-full table-fixed text-left text-sm rtl:text-right">
        <thead>
          <tr>
            <th class="w-[160px] px-4 py-2">
              <a
                href={buildUrl({
                  page: 1,
                  sort: oppositeSort,
                  action: props.action,
                  player: props.player,
                  ip: props.ip,
                })}
                hx-get={buildUrl({
                  page: 1,
                  sort: oppositeSort,
                  action: props.action,
                  player: props.player,
                  ip: props.ip,
                })}
                hx-target="#log-results"
                class="hover:text-abru-light-75 cursor-pointer"
              >
                Date{sortIndicator}
              </a>
            </th>
            <th class="w-[120px] px-4 py-2">Name</th>
            <th class="w-[160px] px-4 py-2">SteamId</th>
            <th class="w-[100px] px-4 py-2">IP</th>
            <th class="px-4 py-2">User agent</th>
            <th class="w-[30%] px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {props.logs.map(action => (
            <LogEntry
              action={action}
              playerName={props.playerNames.get(action.player) ?? 'Unknown'}
            />
          ))}
          {props.logs.length === 0 && (
            <tr>
              <td colspan="6" class="text-abru-light-50 px-4 py-8 text-center">
                No log entries found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {last > 1 && (
        <div class="flex justify-center p-4">
          <Pagination
            lastPage={last}
            currentPage={props.page}
            around={around}
            hrefFn={page =>
              buildUrl({ page, sort: props.sort, action: props.action, player: props.player, ip: props.ip })
            }
            hxTarget="#log-results"
          />
        </div>
      )}
    </>
  )
}

function LogEntry(props: { action: PlayerActionEntryModel; playerName: string }) {
  return (
    <tr class="even:bg-abru-dark-6">
      <th scope="row" class="truncate px-4 py-2" safe>
        {props.action.timestamp.toLocaleString()}
      </th>
      <td class="truncate px-4 py-2">
        <a href={`/players/${props.action.player}`} safe>
          {props.playerName}
        </a>
      </td>
      <td class="truncate px-4 py-2" safe>
        {props.action.player}
      </td>
      <td class="truncate px-4 py-2" safe>
        {props.action.ipAddress}
      </td>
      <td class="truncate px-4 py-2" safe>
        {props.action.userAgent}
      </td>
      <td class="truncate px-4 py-2" safe>
        {props.action.action}
      </td>
    </tr>
  )
}

function buildUrl(params: {
  page: number
  sort: string
  action?: string | undefined
  player?: string | undefined
  ip?: string | undefined
}): string {
  const url = new URL('/admin/player-action-logs', 'http://localhost')
  url.searchParams.set('page', String(params.page))
  url.searchParams.set('sort', params.sort)
  if (params.action) {
    url.searchParams.set('action', params.action)
  }
  if (params.player) {
    url.searchParams.set('player', params.player)
  }
  if (params.ip) {
    url.searchParams.set('ip', params.ip)
  }
  return `${url.pathname}${url.search}`
}
