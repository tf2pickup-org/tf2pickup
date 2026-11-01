import { IconHeadset } from '../../../html/components/icons'
import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function MumbleSettingsEntry(props: { steamId: SteamId64 }) {
  const { mumbleCertificate } = await players.bySteamId(props.steamId, ['mumbleCertificate'])
  return (
    <div class="bg-abru-light-5 flex flex-row items-center gap-4 rounded-sm p-2">
      <IconHeadset size={32} />
      <p class="font-bold">Mumble</p>
      {mumbleCertificate ? (
        <>
          <p>Your Mumble certificate is linked, so you can join your games' voice channels</p>
          <div class="flex-1"></div>
          <a class="button" data-size="dense" href="/mumble" data-umami-event="mumble-verify-again">
            Verify again
          </a>
        </>
      ) : (
        <>
          <p>Link your Mumble certificate to join your games' voice channels</p>
          <div class="flex-1"></div>
          <a
            class="button"
            data-variant="accent"
            data-size="dense"
            href="/mumble"
            data-umami-event="mumble-verify"
          >
            Set up
          </a>
        </>
      )}
    </div>
  )
}
