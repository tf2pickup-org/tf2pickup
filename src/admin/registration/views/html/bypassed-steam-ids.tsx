import { configuration } from '../../../../configuration'
import { IconX } from '../../../../html/components/icons'

export async function BypassedSteamIds() {
  const bypassedSteamIds = await configuration.get('players.bypass_registration_restrictions')

  return (
    <div class="my-4 flex flex-col gap-2" id="bypassedSteamIds">
      {bypassedSteamIds.length > 0 ? (
        bypassedSteamIds.map(steamId => (
          <div class="flex flex-row items-center gap-2 text-white">
            <p safe>{steamId}</p>
            <button
              class="text-gray-400"
              hx-delete={`/admin/bypass-registration-restrictions/${steamId}`}
              hx-target="#bypassedSteamIds"
              hx-swap="outerHTML"
            >
              <IconX size={16} />
            </button>
          </div>
        ))
      ) : (
        <p class="italic">No steam IDs added</p>
      )}
    </div>
  )
}
