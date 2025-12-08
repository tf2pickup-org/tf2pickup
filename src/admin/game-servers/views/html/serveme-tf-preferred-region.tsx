import { memoize } from 'es-toolkit'
import { servemeTf } from '../../../../serveme-tf'
import getUnicodeFlagIcon from 'country-flag-icons/unicode'
import { configuration } from '../../../../configuration'
import { IconLoader3 } from '../../../../html/components/icons'

export function ServemeTfPreferredRegion() {
  return (
    <p class="mt-2">
      <dl>
        <dt>
          <label for="serveme-tf-preferred-region-select">
            Preferred region for reserved servers
          </label>
        </dt>
        <dd>
          <div>
            <RegionList />
          </div>
          <span class="text-sm text-abru-light-75">
            If a game server from the preferred region is not available, another one will be picked
            up instead.
          </span>
        </dd>
      </dl>
    </p>
  )
}

const getRegions = memoize(async () => await servemeTf.listRegions())

interface SaveResult {
  success: true
}

export async function RegionList(props?: { saveResult?: SaveResult }) {
  const regions = await getRegions()
  const selected = await configuration.get('serveme_tf.preferred_region')

  return (
    <div id="serveme-tf-preferred-region" class="flex flex-row items-center gap-2">
      <select
        name="servemeTfPreferredRegion"
        id="serveme-tf-preferred-region-select"
        hx-put="/admin/game-servers/serveme-tf/preferred-region"
        hx-trigger="change"
        hx-target="#serveme-tf-preferred-region"
        hx-swap="outerHTML"
        hx-disabled-elt="this"
        class="peer"
      >
        <option value="none" selected={selected === null}>
          none
        </option>
        {regions.map(region => (
          <option value={region} selected={region === selected} safe>
            {getUnicodeFlagIcon(region)} {region}
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
