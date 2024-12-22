import type { User } from '../../../../auth/types/user'
import { configuration } from '../../../../configuration'
import { VoiceServerType } from '../../../../shared/types/voice-server-type'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function VoiceServerPage(props: { user: User }) {
  const type = await configuration.get('games.voice_server_type')
  const staticLink = await configuration.get('games.voice_server.static_link')
  const [mumbleUrl, mumblePort, mumblePassword, mumbleChannelName] = await Promise.all([
    configuration.get('games.voice_server.mumble.url'),
    configuration.get('games.voice_server.mumble.port'),
    configuration.get('games.voice_server.mumble.password'),
    configuration.get('games.voice_server.mumble.channel_name'),
  ])

  return (
    <Admin activePage="voice-server" user={props.user}>
      <form action="" method="post" id="voiceServerForm">
        <div class="admin-panel-set">
          <div class="form-checkbox">
            <input
              type="radio"
              name="type"
              value={VoiceServerType.none}
              id="voiceServerNone"
              aria-describedby="voiceServerNoneDesc"
              checked={type === VoiceServerType.none}
            />
            <label for="voiceServerNone">Disabled</label>
            <p class="description" id="voiceServerNoneDesc">
              No voice server will be used.
            </p>
          </div>

          <div class="form-checkbox">
            <input
              type="radio"
              name="type"
              value={VoiceServerType.staticLink}
              id="voiceServerStaticLink"
              aria-describedby="voiceServerStaticLinkDesc"
              checked={type === VoiceServerType.staticLink}
            />
            <label for="voiceServerStaticLink">Static link</label>
            <input
              type="text"
              value={staticLink ?? ''}
              id="static-link"
              name="staticLink"
              placeholder="https://example.com"
              class="ml-4"
              disabled={type !== VoiceServerType.staticLink}
              _={`
                on change from #voiceServerForm
                  if #voiceServerForm.type.value is '${VoiceServerType.staticLink}'
                    remove [@disabled]
                  else
                    add [@disabled]
                  end
              `}
            />
            <p class="description" id="voiceServerStaticLinkDesc">
              Players will be handed a static link to connect to the voice server
            </p>
          </div>

          <div class="form-checkbox">
            <input
              type="radio"
              name="type"
              value={VoiceServerType.mumble}
              id="voice-server-mumble"
              checked={type === VoiceServerType.mumble}
            />
            <label for="voice-server-mumble">Mumble</label>
            <p class="description" id="voice-server-mumble-desc">
              A mumble server will be used for the voice during games. Channels will be managed
              automatically.
            </p>
          </div>

          <fieldset
            class="ml-[22px]"
            id="mumble-server-data"
            disabled={type !== VoiceServerType.mumble}
            _={`
                on change from #voiceServerForm
                  if #voiceServerForm.type.value is '${VoiceServerType.mumble}'
                    remove [@disabled]
                  else
                    add [@disabled]
                  end
              `}
          >
            <dl>
              <dt>
                <label for="mumble-url" class="font-medium">
                  Server URL
                </label>
              </dt>
              <dd class="flex flex-row gap-2">
                <input
                  type="text"
                  name="mumbleUrl"
                  id="mumble-url"
                  value={mumbleUrl ?? ''}
                  placeholder="mumble.tf2pickup.org"
                />
                <input type="number" name="mumblePort" value={mumblePort.toString()} />
              </dd>
            </dl>

            <dl>
              <dt>
                <label for="mumble-password" class="font-medium">
                  Server password
                </label>
              </dt>
              <dd>
                <input type="text" name="mumblePassword" value={mumblePassword ?? ''} />
              </dd>
            </dl>

            <dl>
              <dt>
                <label for="mumble-channel-name" class="font-medium">
                  Channel name
                </label>
              </dt>
              <dd>
                <input type="text" name="mumbleChannelName" value={mumbleChannelName ?? ''} />
              </dd>
            </dl>
          </fieldset>

          <p class="mt-8">
            <SaveButton />
          </p>
        </div>
      </form>
    </Admin>
  )
}
