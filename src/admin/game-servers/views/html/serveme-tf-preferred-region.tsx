import { memoize } from 'es-toolkit'
import { servemeTf } from '../../../../serveme-tf'
import getUnicodeFlagIcon from 'country-flag-icons/unicode'
import { configuration } from '../../../../configuration'
import { IconLoader3 } from '../../../../html/components/icons'

// The region list comes from serveme.tf, so it is loaded after the page.
export function ServemeTfPreferredRegion() {
  return (
    <div
      id="serveme-tf-preferred-region"
      hx-get="/admin/game-servers/serveme-tf/preferred-region"
      hx-trigger="load"
      hx-swap="outerHTML"
    >
      <IconLoader3 class="animate-spin" />
    </div>
  )
}

const getRegions = memoize(async () => await servemeTf.listRegions())

export async function RegionList() {
  const regions = await getRegions()
  const selected = await configuration.get('serveme_tf.preferred_region')

  return (
    <select name="servemeTfPreferredRegion" id="serveme-tf-preferred-region-select">
      <option value="none" selected={selected === null}>
        none
      </option>
      {selected !== null && !regions.includes(selected) && (
        <option value={selected} selected safe>
          {`${selected} (not offered by serveme.tf right now)`}
        </option>
      )}
      {regions.map(region => (
        <option value={region} selected={region === selected} safe>
          {getUnicodeFlagIcon(region)} {region}
        </option>
      ))}
    </select>
  )
}
