import { configuration } from '../../../../configuration'
import { servemeTf } from '../../../../serveme-tf'
import { HideServerInfoMode } from '../../../../shared/types/hide-server-info-mode'
import { tf2QuickServer } from '../../../../tf2-quick-server'
import { durationUnit } from '../../../games/duration-unit'
import { Admin } from '../../../views/html/admin'
import { DurationInput } from '../../../views/html/duration-input'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { ServemeTfBanGameServers } from './serveme-tf-ban-gameservers'
import { ServemeTfBanPatternForm } from './serveme-tf-ban-pattern-form'
import { ServemeTfPreferredRegion } from './serveme-tf-preferred-region'
import { StaticGameServerList } from './static-game-server-list'
import { Tf2QuickServerRegion } from './tf2-quick-server-region'

const hideServerInfoModes: { mode: HideServerInfoMode; label: string; description: string }[] = [
  {
    mode: HideServerInfoMode.auto,
    label: 'Auto',
    description: 'Hide it, except on serveme.tf servers, which have built-in DDoS protection.',
  },
  {
    mode: HideServerInfoMode.always,
    label: 'Always hide',
    description: 'Hide it on every server.',
  },
  { mode: HideServerInfoMode.never, label: 'Never hide', description: 'Show it to everyone.' },
]

export async function GameServersPage() {
  const [hideServerInfo, preferredGameserver, tf2QuickServerTimeout] = await Promise.all([
    configuration.get('games.hide_server_info_from_spectators'),
    configuration.get('serveme_tf.preferred_gameserver'),
    configuration.get('tf2_quick_server.timeout'),
  ])

  return (
    <Admin activePage="game-servers">
      <div class="flex flex-col gap-4">
        <SettingCard
          title="Static servers"
          description="Servers running the tf2pickup.org connector plugin register themselves here. They are used first, before serveme.tf and TF2 QuickServer."
        >
          <div class="py-4 max-lg:overflow-x-auto">
            <StaticGameServerList />
          </div>
        </SettingCard>

        <ServemeTfBanPatternForm />
        <form action="/admin/game-servers" method="post" class="flex flex-col gap-4" data-save-bar>
          <SettingCard title="Connect info">
            <SettingRow
              label="Hide server info from spectators"
              configKey="games.hide_server_info_from_spectators"
              description="Hides the connect info (including SourceTV) from everyone but the game's players, to mitigate DDoS attacks."
            >
              <fieldset class="flex flex-col gap-2">
                <legend class="sr-only">Hide server info from spectators</legend>
                {hideServerInfoModes.map(({ mode, label, description }) => (
                  <label class="flex flex-row items-start gap-2">
                    <input
                      type="radio"
                      name="hideServerInfoMode"
                      value={mode}
                      checked={mode === hideServerInfo}
                      class="mt-1"
                    />
                    <span>
                      <span class="text-white" safe>
                        {label}
                      </span>
                      <span class="block text-sm text-zinc-400" safe>
                        {description}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            </SettingRow>
          </SettingCard>

          <SettingCard
            title="serveme.tf"
            description={
              servemeTf.isEnabled
                ? 'Connected. Servers are reserved here when no static server is free.'
                : 'Not configured. Set SERVEME_TF_API_KEY in the environment to enable it.'
            }
          >
            {servemeTf.isEnabled && (
              <>
                <SettingRow
                  label="Preferred region"
                  for="serveme-tf-preferred-region-select"
                  configKey="serveme_tf.preferred_region"
                  description="If no server from this region is available, another one is picked."
                >
                  <ServemeTfPreferredRegion />
                </SettingRow>
                <SettingRow
                  label="Preferred server"
                  for="servemeTfPreferredGameserver"
                  configKey="serveme_tf.preferred_gameserver"
                  description="Name of a server to always pick when it is available."
                >
                  <input
                    type="text"
                    id="servemeTfPreferredGameserver"
                    name="servemeTfPreferredGameserver"
                    value={preferredGameserver ?? ''}
                    placeholder="None"
                  />
                </SettingRow>
                <SettingRow
                  label="Banned game server name patterns"
                  configKey="serveme_tf.ban_gameservers"
                  description="Servers whose names contain any of these are never picked."
                >
                  <ServemeTfBanGameServers />
                </SettingRow>
              </>
            )}
          </SettingCard>

          <SettingCard
            title="TF2 QuickServer"
            description={
              tf2QuickServer.isEnabled
                ? 'Connected. Servers are created here as the last resort.'
                : 'Not configured. Set TF2_QUICK_SERVER_CLIENT_ID and TF2_QUICK_SERVER_CLIENT_SECRET in the environment to enable it.'
            }
          >
            {tf2QuickServer.isEnabled && (
              <>
                <SettingRow
                  label="Region"
                  for="tf2-quick-server-region-select"
                  configKey="tf2_quick_server.region"
                >
                  <Tf2QuickServerRegion />
                </SettingRow>
                <details class="pb-4">
                  <summary class="cursor-pointer py-2 text-sm text-zinc-200">Advanced</summary>
                  <SettingRow
                    label="Creation timeout"
                    for="tf2QuickServerTimeout"
                    configKey="tf2_quick_server.timeout"
                    defaultLabel={durationUnit.label(
                      configuration.getDefault('tf2_quick_server.timeout'),
                    )}
                    description="How long to wait for a new server before giving up."
                  >
                    <DurationInput
                      id="tf2QuickServerTimeout"
                      name="tf2QuickServerTimeout"
                      valueMs={tf2QuickServerTimeout}
                      units={['seconds', 'minutes']}
                      min={1}
                    />
                  </SettingRow>
                </details>
              </>
            )}
          </SettingCard>

          <SaveBar />
        </form>
      </div>
    </Admin>
  )
}
