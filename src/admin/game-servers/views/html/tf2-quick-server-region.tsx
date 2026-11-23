import { configuration } from '../../../../configuration'
import { tf2QuickServerRegions } from '../../../../tf2-quick-server/regions'

export async function Tf2QuickServerRegion() {
  const selected = await configuration.get('tf2_quick_server.region')

  return (
    <select name="tf2QuickServerRegion" id="tf2-quick-server-region-select">
      {tf2QuickServerRegions.map(region => (
        <option value={region.key} selected={region.key === selected} safe>
          {region.label}
        </option>
      ))}
    </select>
  )
}
