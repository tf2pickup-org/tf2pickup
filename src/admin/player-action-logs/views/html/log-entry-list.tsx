import type { PlayerActionEntryModel } from '../../../../database/models/player-action-entry.model'
import { IconLoader3 } from '../../../../html/components/icons'
import { players } from '../../../../players'

export async function LogEntryList(props: { logs: PlayerActionEntryModel[] }) {
  return (
    <>
      {props.logs.map(action => (
        <LogEntry action={action} />
      ))}
      {props.logs.length > 0 && (
        <tr
          hx-get={`/admin/player-action-logs/batch?before=${props.logs[props.logs.length - 1]!.timestamp.getTime()}`}
          hx-trigger="intersect once"
          hx-swap="outerHTML"
        >
          <td colspan="6">
            <IconLoader3 class="animate-spin text-abru-light-50" />
          </td>
        </tr>
      )}
    </>
  )
}

async function LogEntry(props: { action: PlayerActionEntryModel }) {
  const player = await players.bySteamId(props.action.player)
  return (
    <tr class="even:bg-abru-dark-6">
      <th scope="row" class="px-4 py-2" safe>
        {props.action.timestamp.toLocaleString()}
      </th>
      <td class="px-4 py-2">
        <a href={`/players/${player.steamId}`} safe>
          {player.name}
        </a>
      </td>
      <td class="px-4 py-2" safe>
        {props.action.player}
      </td>
      <td class="px-4 py-2" safe>
        {props.action.ipAddress}
      </td>
      <td class="px-4 py-2" safe>
        {ellipsis(props.action.userAgent ?? '', 64)}
      </td>
      <td class="px-4 py-2" safe>
        {props.action.action}
      </td>
    </tr>
  )
}

function ellipsis(str: string, maxLength: number, ellipsis = '...'): string {
  if (str.length <= maxLength) {
    return str
  }
  return str.slice(0, maxLength - ellipsis.length) + ellipsis
}
