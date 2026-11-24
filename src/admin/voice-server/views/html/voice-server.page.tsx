import { configuration } from '../../../../configuration'
import { VoiceServerType } from '../../../../shared/types/voice-server-type'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'
import { MumbleClientStatus } from './mumble-client-status'
import { Switch } from '../../../../html/components/switch'

export async function VoiceServerPage() {
  const type = await configuration.get('games.voice_server_type')
  const staticLink = await configuration.get('games.voice_server.static_link')
  const [
    mumbleUrl,
    mumbleInternalUrl,
    mumblePort,
    mumblePassword,
    mumbleChannelName,
    mumbleUsername,
    mumblePlayerVerification,
  ] = await Promise.all([
    configuration.get('games.voice_server.mumble.url'),
    configuration.get('games.voice_server.mumble.internal_url'),
    configuration.get('games.voice_server.mumble.port'),
    configuration.get('games.voice_server.mumble.password'),
    configuration.get('games.voice_server.mumble.channel_name'),
    configuration.get('games.voice_server.mumble.username'),
    configuration.get('games.voice_server.mumble.player_verification'),
  ])

  return (
    <Admin activePage="voice-server">
      <form
        action=""
        method="post"
        id="voiceServerForm"
        class="group/voice-server flex flex-col gap-4"
        data-save-bar
      >
        <SettingCard
          title="Voice server"
          description="What players are given to talk to their team during a game."
        >
          <fieldset class="flex flex-col gap-3 py-4">
            <legend class="sr-only">Voice server type</legend>
            <label class="flex flex-row items-start gap-2">
              <input
                type="radio"
                name="type"
                value={VoiceServerType.none}
                id="voiceServerNone"
                checked={type === VoiceServerType.none}
                class="mt-1"
              />
              <span>
                <span class="text-white">Disabled</span>
                <span class="block text-sm text-zinc-400">No voice server is used.</span>
              </span>
            </label>
            <div class="flex flex-row flex-wrap items-start gap-2">
              <label class="flex flex-row items-start gap-2">
                <input
                  type="radio"
                  name="type"
                  value={VoiceServerType.staticLink}
                  id="voiceServerStaticLink"
                  checked={type === VoiceServerType.staticLink}
                  class="mt-1"
                />
                <span>
                  <span class="text-white">Static link</span>
                  <span class="block text-sm text-zinc-400">
                    Every game shows the same link to the voice server.
                  </span>
                </span>
              </label>
              <label for="static-link" class="sr-only">
                Static voice server link
              </label>
              <input
                type="text"
                value={staticLink ?? ''}
                id="static-link"
                name="staticLink"
                placeholder="https://example.com"
                class="min-w-0 flex-1"
                disabled={type !== VoiceServerType.staticLink}
                data-toggle-disabled-form="#voiceServerForm"
                data-toggle-disabled-control="type"
                data-toggle-disabled-value={VoiceServerType.staticLink}
              />
            </div>
            <label class="flex flex-row items-start gap-2">
              <input
                type="radio"
                name="type"
                value={VoiceServerType.mumble}
                id="voice-server-mumble"
                checked={type === VoiceServerType.mumble}
                class="mt-1"
              />
              <span>
                <span class="text-white">Mumble</span>
                <span class="block text-sm text-zinc-400">
                  Channels are created and cleaned up for each game automatically.
                </span>
              </span>
            </label>
          </fieldset>
        </SettingCard>

        <fieldset
          id="mumble-server-data"
          disabled={type !== VoiceServerType.mumble}
          data-toggle-disabled-form="#voiceServerForm"
          data-toggle-disabled-control="type"
          data-toggle-disabled-value={VoiceServerType.mumble}
        >
          <SettingCard title="Mumble">
            <SettingRow
              label="Server URL"
              for="mumble-url"
              configKey="games.voice_server.mumble.url"
              description="Address and port players connect to."
            >
              <div class="flex flex-row gap-2">
                <input
                  type="text"
                  name="mumbleUrl"
                  id="mumble-url"
                  value={mumbleUrl ?? ''}
                  placeholder="mumble.tf2pickup.org"
                  class="min-w-0 flex-1"
                />
                <label for="mumble-port" class="sr-only">
                  Server port
                </label>
                <input
                  type="number"
                  id="mumble-port"
                  name="mumblePort"
                  value={mumblePort.toString()}
                  class="w-24"
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Server password"
              for="mumble-password"
              configKey="games.voice_server.mumble.password"
            >
              <input
                type="text"
                id="mumble-password"
                name="mumblePassword"
                value={mumblePassword ?? ''}
              />
            </SettingRow>

            <SettingRow
              label="Channel name"
              for="mumble-channel-name"
              configKey="games.voice_server.mumble.channel_name"
              description="Game channels are created inside this channel."
            >
              <input
                type="text"
                id="mumble-channel-name"
                name="mumbleChannelName"
                value={mumbleChannelName ?? ''}
              />
            </SettingRow>

            <SettingRow
              label="Verify players automatically"
              for="mumble-player-verification"
              configKey="games.voice_server.mumble.player_verification"
              description="Only a game's players can join its channels; they are recognized by their Mumble certificate. When off, who can join is up to the Mumble server's own permissions."
            >
              <div class="flex justify-end">
                <Switch
                  id="mumble-player-verification"
                  name="mumblePlayerVerification"
                  checked={mumblePlayerVerification}
                />
              </div>
            </SettingRow>

            <details class="pb-4">
              <summary class="cursor-pointer py-2 text-sm text-zinc-200">
                Advanced: internal URL, bot username
              </summary>
              <SettingRow
                label="Internal server URL"
                for="mumble-internal-url"
                configKey="games.voice_server.mumble.internal_url"
                description="Optional. The address the bot uses, when it differs from the public one."
              >
                <input
                  type="text"
                  id="mumble-internal-url"
                  name="mumbleInternalUrl"
                  value={mumbleInternalUrl ?? ''}
                />
              </SettingRow>
              <SettingRow
                label="Bot username"
                for="mumble-username"
                configKey="games.voice_server.mumble.username"
                description="Name the bot uses when connecting to the Mumble server."
              >
                <input
                  type="text"
                  id="mumble-username"
                  name="mumbleUsername"
                  value={mumbleUsername}
                />
              </SettingRow>
            </details>

            <div class="pb-4">
              <MumbleClientStatus />
            </div>
          </SettingCard>
        </fieldset>

        <SaveBar />
      </form>
    </Admin>
  )
}
