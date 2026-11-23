import { configuration } from '../../../../configuration'
import { IconPlus, IconX } from '../../../../html/components/icons'

// Lives inside the page's settings form, but adds and removes patterns on its own: its controls
// belong to the servemeTfBanPatternForm form, declared outside the settings form.
export function ServemeTfBanGameServers() {
  return (
    <div class="flex flex-col gap-2" data-save-bar-ignore>
      <BannedGameServersList />
      <div class="flex flex-row items-center gap-2 max-lg:flex-wrap">
        <label for="serveme-tf-ban-gameservers-input" class="sr-only">
          Banned game server name pattern
        </label>
        <input
          type="text"
          name="pattern"
          id="serveme-tf-ban-gameservers-input"
          form="servemeTfBanPatternForm"
          required
          placeholder="Server name pattern"
          class="min-w-0 flex-1"
        />
        <button
          type="submit"
          form="servemeTfBanPatternForm"
          class="button"
          data-variant="accent"
          data-size="dense"
        >
          <IconPlus size={20} />
          <span>Add pattern</span>
        </button>
      </div>
    </div>
  )
}

export async function BannedGameServersList() {
  const bannedServers = await configuration.get('serveme_tf.ban_gameservers')

  return (
    <div class="flex flex-col gap-2" id="bannedGameServersList">
      {bannedServers.length > 0 ? (
        bannedServers.map(pattern => (
          <div class="flex flex-row items-center gap-2 text-white">
            <p safe>{pattern}</p>
            <button
              type="button"
              class="text-gray-400"
              aria-label={`Remove ${pattern}`}
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
