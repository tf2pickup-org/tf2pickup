import type { WithId } from 'mongodb'
import type {
  ActivityLogEntryModel,
  ActivityLogEntryType,
} from '../../../../database/models/activity-log-entry.model'
import type { PlayerSkill } from '../../../../database/models/player.model'
import { Pagination, paginate } from '../../../../html/components/pagination'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { logsPerPage } from '../../../../activity-log/get-logs'

interface ActivityLogEntryListProps {
  logs: WithId<ActivityLogEntryModel>[]
  playerNames: Map<SteamId64, string>
  page: number
  totalCount: number
  sort: 'asc' | 'desc'
  type?: ActivityLogEntryType | undefined
  player?: string | undefined
}

const typeLabels: Record<ActivityLogEntryType, string> = {
  'player name change': 'Name change',
  'player skill change': 'Skill change',
  'configuration change': 'Config change',
  'ban added': 'Ban added',
  'ban revoked': 'Ban revoked',
  'map pool change': 'Map pool change',
  'map scramble': 'Map scramble',
  'game reconfigured': 'Game reconfigured',
  'game server reassigned': 'Server reassigned',
  'game force-ended': 'Game force-ended',
  'substitute requested': 'Sub requested',
}

const typeColors: Record<ActivityLogEntryType, string> = {
  'player name change': 'text-blue-400',
  'player skill change': 'text-green-400',
  'configuration change': 'text-purple-400',
  'ban added': 'text-red-400',
  'ban revoked': 'text-orange-400',
  'map pool change': 'text-teal-400',
  'map scramble': 'text-yellow-400',
  'game reconfigured': 'text-sky-400',
  'game server reassigned': 'text-cyan-400',
  'game force-ended': 'text-rose-400',
  'substitute requested': 'text-amber-400',
}

export function ActivityLogEntryList(props: ActivityLogEntryListProps) {
  const { last, around } = paginate(props.page, logsPerPage, props.totalCount)
  const oppositeSort = props.sort === 'asc' ? 'desc' : 'asc'
  const sortIndicator = props.sort === 'asc' ? ' ↑' : ' ↓'

  return (
    <>
      <input type="hidden" name="sort" value={props.sort} />
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-abru-light-25 border-b">
            <th class="w-[160px] px-4 py-2">
              <a
                href={buildUrl({
                  page: 1,
                  sort: oppositeSort,
                  type: props.type,
                  player: props.player,
                })}
                hx-get={buildUrl({
                  page: 1,
                  sort: oppositeSort,
                  type: props.type,
                  player: props.player,
                })}
                hx-target="#activity-log-results"
                hx-push-url="true"
                class="hover:text-abru-light-75 cursor-pointer"
              >
                Date{sortIndicator}
              </a>
            </th>
            <th class="w-[140px] px-4 py-2">Type</th>
            <th class="w-[140px] px-4 py-2">Player</th>
            <th class="px-4 py-2">Details</th>
            <th class="w-[140px] px-4 py-2">Actor</th>
          </tr>
        </thead>
        <tbody>
          {props.logs.map(log => (
            <ActivityLogEntry log={log} playerNames={props.playerNames} />
          ))}
          {props.logs.length === 0 && (
            <tr>
              <td colspan="5" class="text-abru-light-50 px-4 py-8 text-center">
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
              buildUrl({ page, sort: props.sort, type: props.type, player: props.player })
            }
            hxTarget="#activity-log-results"
          />
        </div>
      )}
    </>
  )
}

function ActivityLogEntry(props: {
  log: WithId<ActivityLogEntryModel>
  playerNames: Map<SteamId64, string>
}) {
  const { log, playerNames } = props
  const player = getPlayer(log)
  const actor = getActor(log)

  return (
    <tr class="even:bg-abru-dark-6">
      <th scope="row" class="px-4 py-2 whitespace-nowrap" safe>
        {log.timestamp.toLocaleString()}
      </th>
      <td class="px-4 py-2">
        <span class={typeColors[log.type]} safe>
          {typeLabels[log.type]}
        </span>
      </td>
      <td class="truncate px-4 py-2">
        {player ? (
          <a href={`/players/${player}`} safe>
            {playerNames.get(player) ?? player}
          </a>
        ) : (
          <span class="text-abru-light-25">—</span>
        )}
      </td>
      <td class="px-4 py-2">
        <Details log={log} playerNames={playerNames} />
      </td>
      <td class="truncate px-4 py-2">
        {actor === 'bot' ? (
          <span class="text-abru-light-50">bot</span>
        ) : actor ? (
          <a href={`/players/${actor}`} safe>
            {playerNames.get(actor) ?? actor}
          </a>
        ) : (
          <span class="text-abru-light-25">—</span>
        )}
      </td>
    </tr>
  )
}

function getPlayer(log: ActivityLogEntryModel): SteamId64 | undefined {
  if (
    log.type === 'player name change' ||
    log.type === 'player skill change' ||
    log.type === 'ban added' ||
    log.type === 'ban revoked' ||
    log.type === 'substitute requested'
  ) {
    return log.player
  }
  return undefined
}

function getActor(log: ActivityLogEntryModel): SteamId64 | 'bot' | undefined {
  if (log.type === 'player skill change' || log.type === 'map scramble') return log.actor
  if (log.type === 'ban added') return log.actor
  if (log.type === 'ban revoked') return log.admin
  if (log.type === 'configuration change') return log.actor
  if (log.type === 'substitute requested') return log.actor
  if (
    log.type === 'game reconfigured' ||
    log.type === 'game server reassigned' ||
    log.type === 'game force-ended'
  )
    return log.actor
  return undefined
}

function Details(props: { log: ActivityLogEntryModel; playerNames: Map<SteamId64, string> }) {
  const { log } = props

  if (log.type === 'player name change') {
    return (
      <span>
        <span class="text-abru-light-50" safe>
          {log.oldName}
        </span>{' '}
        → <span safe>{log.newName}</span>
      </span>
    )
  }

  if (log.type === 'player skill change') {
    const diff = computeSkillDiff(log.oldSkill, log.newSkill)
    return <span safe>{diff || 'No change'}</span>
  }

  if (log.type === 'configuration change') {
    return <span safe>{log.key}</span>
  }

  if (log.type === 'ban added') {
    return (
      <span>
        <span safe>{log.reason}</span>
        <span class="text-abru-light-50"> · expires {log.end.toLocaleDateString()}</span>
      </span>
    )
  }

  if (log.type === 'ban revoked') {
    return (
      <span>
        <span class="text-abru-light-50">Reason was: </span>
        <span safe>{log.reason}</span>
      </span>
    )
  }

  if (log.type === 'map pool change') {
    const preview = log.maps.slice(0, 5).join(', ')
    const extra = log.maps.length > 5 ? ` +${log.maps.length - 5} more` : ''
    return (
      <span>
        <span safe>{preview}</span>
        {extra && (
          <span class="text-abru-light-50" safe>
            {extra}
          </span>
        )}
      </span>
    )
  }

  if (log.type === 'game reconfigured' || log.type === 'game force-ended') {
    return (
      <a href={`/games/${log.gameNumber}`} class="hover:text-abru-light-75">
        Game #{log.gameNumber}
      </a>
    )
  }

  if (log.type === 'game server reassigned') {
    return (
      <span>
        <a href={`/games/${log.gameNumber}`} class="hover:text-abru-light-75">
          Game #{log.gameNumber}
        </a>
        <span class="text-abru-light-50"> → </span>
        <span safe>{log.gameServer}</span>
      </span>
    )
  }

  if (log.type === 'substitute requested') {
    return (
      <span>
        <a href={`/games/${log.gameNumber}`} class="hover:text-abru-light-75">
          Game #{log.gameNumber}
        </a>
        <span class="text-abru-light-50" safe>
          {' '}
          · {log.gameClass}
        </span>
        {log.reason && (
          <span class="text-abru-light-50">
            {' '}
            · <span safe>{log.reason}</span>
          </span>
        )}
      </span>
    )
  }

  return <span safe>{log.maps.join(', ')}</span>
}

function computeSkillDiff(oldSkill: PlayerSkill, newSkill: PlayerSkill): string {
  const allKeys = new Set([...Object.keys(oldSkill), ...Object.keys(newSkill)])
  const parts: string[] = []
  for (const key of allKeys) {
    const oldVal = oldSkill[key as keyof PlayerSkill]
    const newVal = newSkill[key as keyof PlayerSkill]
    if (oldVal !== newVal) {
      parts.push(`${key}: ${oldVal ?? '—'} → ${newVal ?? '—'}`)
    }
  }
  return parts.join(', ')
}

function buildUrl(params: {
  page: number
  sort: string
  type?: ActivityLogEntryType | undefined
  player?: string | undefined
}): string {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('sort', params.sort)
  if (params.type) qs.set('type', params.type)
  if (params.player) qs.set('player', params.player)
  return `/admin/activity-log?${qs.toString()}`
}
