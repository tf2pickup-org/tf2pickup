import { configuration } from '../../../../configuration'
import { IconLoader3 } from '../../../../html/components/icons'
import { tf2QuickServerRegions } from '../../../../tf2-quick-server/regions'

export function Tf2QuickServerRegion() {
  return (
    <p class="mt-2">
      <dl>
        <dt>
          <label for="tf2-quick-server-region-select">Region</label>
        </dt>
        <dd>
          <div
            id="tf2-quick-server-region"
            hx-get="/admin/game-servers/tf2-quick-server/region"
            hx-trigger="load"
            hx-swap="outerHTML"
            class="flex flex-row items-center gap-2"
          >
            <IconLoader3 class="animate-spin" />
          </div>
        </dd>
      </dl>
    </p>
  )
}

interface SaveResult {
  success: true
}

export async function RegionSelect(props?: { saveResult?: SaveResult }) {
  const selected = await configuration.get('tf2_quick_server.region')

  return (
    <div id="tf2-quick-server-region" class="flex flex-row items-center gap-2">
      <select
        name="tf2QuickServerRegion"
        id="tf2-quick-server-region-select"
        hx-put="/admin/game-servers/tf2-quick-server/region"
        hx-trigger="change"
        hx-target="#tf2-quick-server-region"
        hx-swap="outerHTML"
        hx-disabled-elt="this"
        class="peer"
      >
        {tf2QuickServerRegions.map(region => (
          <option value={region.key} selected={region.key === selected} safe>
            {region.label}
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
