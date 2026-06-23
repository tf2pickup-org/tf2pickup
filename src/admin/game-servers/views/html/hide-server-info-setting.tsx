import { configuration } from '../../../../configuration'
import { IconLoader3 } from '../../../../html/components/icons'
import { HideServerInfoMode } from '../../../../shared/types/hide-server-info-mode'

const labels: Record<HideServerInfoMode, string> = {
  [HideServerInfoMode.never]: 'never (show to everyone)',
  [HideServerInfoMode.auto]: 'auto (hide for non-serveme.tf servers)',
  [HideServerInfoMode.always]: 'always (hide for all servers)',
}

export function HideServerInfoSetting() {
  return (
    <p class="mt-2">
      <dl>
        <dt>
          <label for="hide-server-info-select">Hide server info from spectators</label>
        </dt>
        <dd>
          <HideServerInfoSelect />
          <span class="text-abru-light-75 text-sm">
            Hides the game server connect info (including SourceTV) from everyone except match
            participants, to mitigate DDoS attacks. serveme.tf servers have built-in DDoS
            protection, so "auto" leaves them visible.
          </span>
        </dd>
      </dl>
    </p>
  )
}

export async function HideServerInfoSelect(props?: { saveResult?: { success: true } }) {
  const selected = await configuration.get('games.hide_server_info_from_spectators')

  return (
    <div id="hide-server-info" class="flex flex-row items-center gap-2">
      <select
        name="hideServerInfoMode"
        id="hide-server-info-select"
        hx-put="/admin/game-servers/hide-server-info"
        hx-trigger="change"
        hx-target="#hide-server-info"
        hx-swap="outerHTML"
        hx-disabled-elt="this"
        class="peer"
      >
        {Object.values(HideServerInfoMode).map(mode => (
          <option value={mode} selected={mode === selected} safe>
            {labels[mode]}
          </option>
        ))}
      </select>
      <IconLoader3 class="hidden animate-spin peer-[.htmx-request]:block" />
      {props?.saveResult?.success === true && (
        <span remove-me="3s" class="text-green-600">
          saved!
        </span>
      )}
    </div>
  )
}
