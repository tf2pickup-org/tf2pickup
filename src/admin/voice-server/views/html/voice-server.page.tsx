import { configuration } from '../../../../configuration'
import { VoiceServerType } from '../../../../shared/types/voice-server-type'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'
import { MumbleClientStatus } from './mumble-client-status'

export async function VoiceServerPage() {
  const type = await configuration.get('games.voice_server_type')
  const staticLink = await configuration.get('games.voice_server.static_link')
  const [mumbleUrl, mumbleInternalUrl, mumblePort, mumblePassword, mumbleChannelName] =
    await Promise.all([
      configuration.get('games.voice_server.mumble.url'),
      configuration.get('games.voice_server.mumble.internal_url'),
      configuration.get('games.voice_server.mumble.port'),
      configuration.get('games.voice_server.mumble.password'),
      configuration.get('games.voice_server.mumble.channel_name'),
    ])
  const [discordGuildId, discordCategoryId, discordPostgameCategoryId] = await Promise.all([
    configuration.get('games.voice_server.discord.guild_id'),
    configuration.get('games.voice_server.discord.category_id'),
    configuration.get('games.voice_server.discord.postgame_category_id'),
  ])

  return (
    <Admin activePage="voice-server">
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

          <div class="form-checkbox">
            <input
              type="radio"
              name="type"
              value={VoiceServerType.discord}
              id="voice-server-discord"
              checked={type === VoiceServerType.discord}
            />
            <label for="voice-server-discord">Discord</label>
            <p class="description" id="voice-server-discord-desc">
              The Discord bot will create private team voice channels for each game and move players
              into a shared post-game lobby after the match.
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
                <label for="mumble-internal-url" class="font-medium">
                  (Optional) Internal server URL
                </label>
              </dt>
              <dd>
                <input
                  type="text"
                  id="mumble-internal-url"
                  name="mumbleInternalUrl"
                  value={mumbleInternalUrl ?? ''}
                />
              </dd>
            </dl>

            <dl>
              <dt>
                <label for="mumble-password" class="font-medium">
                  Server password
                </label>
              </dt>
              <dd>
                <input
                  type="text"
                  id="mumble-password"
                  name="mumblePassword"
                  value={mumblePassword ?? ''}
                />
              </dd>
            </dl>

            <dl>
              <dt>
                <label for="mumble-channel-name" class="font-medium">
                  Channel name
                </label>
              </dt>
              <dd>
                <input
                  type="text"
                  id="mumble-channel-name"
                  name="mumbleChannelName"
                  value={mumbleChannelName ?? ''}
                />
              </dd>
            </dl>

            <MumbleClientStatus />
          </fieldset>

          <fieldset
            class="ml-[22px]"
            id="discord-server-data"
            disabled={type !== VoiceServerType.discord}
            _={`
                on change from #voiceServerForm
                  if #voiceServerForm.type.value is '${VoiceServerType.discord}'
                    remove [@disabled]
                  else
                    add [@disabled]
                  end
              `}
          >
            <dl>
              <dt>
                <label for="discord-guild-id" class="font-medium">
                  Guild ID
                </label>
              </dt>
              <dd>
                <input
                  type="text"
                  id="discord-guild-id"
                  name="discordGuildId"
                  value={discordGuildId ?? ''}
                />
              </dd>
            </dl>

            <dl>
              <dt>
                <label for="discord-category-id" class="font-medium">
                  Team channel category ID
                </label>
              </dt>
              <dd>
                <input
                  type="text"
                  id="discord-category-id"
                  name="discordCategoryId"
                  value={discordCategoryId ?? ''}
                />
              </dd>
            </dl>

            <dl>
              <dt>
                <label for="discord-postgame-category-id" class="font-medium">
                  Post-game category ID
                </label>
              </dt>
              <dd>
                <input
                  type="text"
                  id="discord-postgame-category-id"
                  name="discordPostgameCategoryId"
                  value={discordPostgameCategoryId ?? ''}
                />
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
