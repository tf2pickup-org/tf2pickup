import type { Tf2QuickServer } from '../../client'
import type { GameNumber } from '../../../database/models/game.model'
import { tf2QuickServerRegions } from '../../regions'
import { IconLoader3 } from '../../../html/components/icons'

export async function Tf2QuickServerList(props: {
  servers?: Tf2QuickServer[]
  defaultRegion?: string | null
  gameNumber?: GameNumber
}) {
  if (props.servers !== undefined) {
    const defaultRegion = props.defaultRegion ?? tf2QuickServerRegions[0]!.key
    const createNewValue = JSON.stringify({
      provider: 'tf2QuickServer',
      server: { select: 'new', region: defaultRegion },
    })

    return (
      <ul>
        {props.servers.map(server => (
          <li>
            <label class="flex flex-row gap-2">
              <input
                type="radio"
                name="gameServer"
                value={JSON.stringify({
                  provider: 'tf2QuickServer',
                  server: { select: 'existing', serverId: server.serverId },
                })}
                onclick="document.getElementById('tf2qs-region-select').style.display='none'"
              />
              <span safe>{server.serverId.substring(0, 8)}</span>
              <span class="text-abru-light-50 text-sm" safe>
                ({server.region})
              </span>
            </label>
          </li>
        ))}
        <li>
          <label class="flex flex-row gap-2">
            <input
              type="radio"
              name="gameServer"
              id="tf2qs-create-new-radio"
              value={createNewValue}
              onclick="document.getElementById('tf2qs-region-select').style.display='block'"
            />
            <span>Create new server</span>
          </label>
          <select
            id="tf2qs-region-select"
            style="display:none"
            onchange="
              const radio = document.getElementById('tf2qs-create-new-radio');
              radio.value = JSON.stringify({ provider: 'tf2QuickServer', server: { select: 'new', region: this.value } });
            "
          >
            {tf2QuickServerRegions.map(r => (
              <option value={r.key} selected={r.key === defaultRegion} safe>
                {r.label}
              </option>
            ))}
          </select>
        </li>
      </ul>
    )
  }

  return (
    <>
      <p class="my-2">TF2 Quick Server</p>
      <div
        class="flex flex-row gap-2"
        hx-get={`/games/${props.gameNumber}/tf2-quick-server-list`}
        hx-target="this"
        hx-swap="outerHTML"
        hx-trigger="open from:#choose-game-server-dialog"
      >
        <IconLoader3 class="animate-spin" />
        <span>Loading...</span>
      </div>
    </>
  )
}
