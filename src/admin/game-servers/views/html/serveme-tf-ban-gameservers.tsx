import { configuration } from '../../../../configuration'
import { IconPlus, IconX } from '../../../../html/components/icons'

export function ServemeTfBanGameServers() {
  return (
    <p class="mt-2">
      <dl>
        <dt>
          <label for="serveme-tf-ban-gameservers-input">
            Banned game server name patterns
          </label>
        </dt>
        <dd>
          <div>
            <BannedGameServersList />
          </div>
          <form
            method="post"
            action="/admin/game-servers/serveme-tf/ban-gameservers"
            class="row flex items-center gap-2 mt-2"
            hx-post="/admin/game-servers/serveme-tf/ban-gameservers"
            hx-target="#bannedGameServersList"
            hx-swap="outerHTML"
            hx-on--after-request="if(event.detail.successful) this.reset()"
          >
            <input
              type="text"
              name="pattern"
              id="serveme-tf-ban-gameservers-input"
              required
              placeholder="Server name pattern"
            />
            <button type="submit" class="button button--accent button--dense">
              <IconPlus size={20} />
              <span>Add pattern</span>
            </button>
          </form>
          <span class="text-sm text-abru-light-75">
            Game servers whose names contain any of these patterns will be excluded when picking a
            server.
          </span>
        </dd>
      </dl>
    </p>
  )
}

export async function BannedGameServersList() {
  const bannedServers = await configuration.get('serveme_tf.ban_gameservers')

  return (
    <div class="my-2 flex flex-col gap-2" id="bannedGameServersList">
      {bannedServers.length > 0 ? (
        bannedServers.map(pattern => (
          <div class="flex flex-row items-center gap-2 text-white">
            <p safe>{pattern}</p>
            <button
              class="text-gray-400"
              hx-delete={`/admin/game-servers/serveme-tf/ban-gameservers/${encodeURIComponent(pattern)}`}
              hx-target="#bannedGameServersList"
              hx-swap="outerHTML"
            >
              <IconX size={16} />
            </button>
          </div>
        ))
      ) : (
        <p class="italic">No banned servers</p>
      )}
    </div>
  )
}

