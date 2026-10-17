import { requestContext } from '@fastify/request-context'
import { KnownEndpoint } from '@tf2pickup-org/serveme-tf-client'
import { configuration } from '../../../../configuration'
import { PlayerRole } from '../../../../database/models/player.model'
import { IconLoader3 } from '../../../../html/components/icons'
import { ServemeTfBanGameServers } from './serveme-tf-ban-gameservers'
import { ServemeTfPreferredRegion } from './serveme-tf-preferred-region'
import { ServemeTfStatus } from './serveme-tf-status'

const endpointLabels: Record<KnownEndpoint, string> = {
  [KnownEndpoint.europe]: 'serveme.tf (Europe)',
  [KnownEndpoint.northAmerica]: 'na.serveme.tf (North America)',
  [KnownEndpoint.southEastAsia]: 'sea.serveme.tf (South-East Asia)',
  [KnownEndpoint.australia]: 'au.serveme.tf (Australia)',
}

export type SavedSection = 'enabled' | 'endpoint' | 'apiKey'

export async function ServemeTfSettings(props?: { savedSection?: SavedSection }) {
  const [enabled, endpoint, apiKey] = await Promise.all([
    configuration.get('serveme_tf.enabled'),
    configuration.get('serveme_tf.api_endpoint'),
    configuration.get('serveme_tf.api_key'),
  ])
  const apiKeySet = apiKey !== null
  const user = requestContext.get('user')
  const isSuperUser = user?.player.roles.includes(PlayerRole.superUser) ?? false

  return (
    <div id="serveme-tf-settings">
      <div class="flex flex-row gap-2">
        <h4>serveme.tf</h4>
        <ServemeTfStatus enabled={enabled && apiKeySet} />
      </div>

      <p class="mt-2">
        <dl>
          <dt>
            <label for="serveme-tf-enabled-select">Integration</label>
          </dt>
          <dd>
            <div id="serveme-tf-enabled" class="flex flex-row items-center gap-2">
              <select
                name="servemeTfEnabled"
                id="serveme-tf-enabled-select"
                hx-put="/admin/game-servers/serveme-tf/enabled"
                hx-trigger="change"
                hx-target="#serveme-tf-settings"
                hx-swap="outerHTML"
                hx-disabled-elt="this"
                class="peer"
              >
                <option value="true" selected={enabled}>
                  enabled
                </option>
                <option value="false" selected={!enabled}>
                  disabled
                </option>
              </select>
              <IconLoader3 class="hidden animate-spin peer-[.htmx-request]:block" />
              {props?.savedSection === 'enabled' && (
                <span remove-me="3s" class="text-green-600">
                  saved!
                </span>
              )}
            </div>
            <span class="text-abru-light-75 text-sm">
              When enabled, serveme.tf servers can be reserved for games.
            </span>
          </dd>
        </dl>
      </p>

      <p class="mt-2">
        <dl>
          <dt>
            <label for="serveme-tf-api-endpoint-select">API endpoint</label>
          </dt>
          <dd>
            <div id="serveme-tf-endpoint" class="flex flex-row items-center gap-2">
              <select
                name="servemeTfApiEndpoint"
                id="serveme-tf-api-endpoint-select"
                hx-put="/admin/game-servers/serveme-tf/endpoint"
                hx-trigger="change"
                hx-target="#serveme-tf-settings"
                hx-swap="outerHTML"
                hx-disabled-elt="this"
                class="peer"
              >
                {Object.values(KnownEndpoint).map(value => (
                  <option value={value} selected={value === endpoint} safe>
                    {endpointLabels[value]}
                  </option>
                ))}
              </select>
              <IconLoader3 class="hidden animate-spin peer-[.htmx-request]:block" />
              {props?.savedSection === 'endpoint' && (
                <span remove-me="3s" class="text-green-600">
                  saved!
                </span>
              )}
            </div>
          </dd>
        </dl>
      </p>

      <p class="mt-2">
        <dl>
          <dt>
            <label for="serveme-tf-api-key-input">API key</label>
          </dt>
          <dd>
            <div id="serveme-tf-api-key" class="flex flex-row items-center gap-2">
              {isSuperUser ? (
                <>
                  <form
                    class="row flex items-center gap-2"
                    hx-put="/admin/game-servers/serveme-tf/api-key"
                    hx-target="#serveme-tf-settings"
                    hx-swap="outerHTML"
                    data-reset-on-success
                  >
                    <input
                      type="password"
                      name="servemeTfApiKey"
                      id="serveme-tf-api-key-input"
                      required
                      autocomplete="off"
                      placeholder={apiKeySet ? '••••••••' : 'API key'}
                    />
                    <button type="submit" class="button" data-variant="accent" data-size="dense">
                      Save key
                    </button>
                  </form>
                  {apiKeySet && (
                    <button
                      class="button"
                      data-size="dense"
                      hx-delete="/admin/game-servers/serveme-tf/api-key"
                      hx-target="#serveme-tf-settings"
                      hx-swap="outerHTML"
                    >
                      Clear
                    </button>
                  )}
                </>
              ) : (
                <p>{apiKeySet ? 'API key is set' : 'API key is not set'}</p>
              )}
              {props?.savedSection === 'apiKey' && (
                <span remove-me="3s" class="text-green-600">
                  saved!
                </span>
              )}
            </div>
            <span class="text-abru-light-75 text-sm">
              API key for reserving serveme.tf servers. Visible to super users only.
            </span>
          </dd>
        </dl>
      </p>

      {enabled && (
        <>
          <ServemeTfPreferredRegion />
          <ServemeTfBanGameServers />
        </>
      )}
    </div>
  )
}
