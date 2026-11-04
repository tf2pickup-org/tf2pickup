import { IconHeadset } from '../../../html/components/icons'
import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function MumbleSettingsEntry(props: { steamId: SteamId64 }) {
  const { mumbleCertificate } = await players.bySteamId(props.steamId, ['mumbleCertificate'])
  return (
    <div class="page-actions flex-row items-center gap-x-8! px-5">
      <p class="flex items-center gap-1 text-2xl font-bold">
        <IconHeadset size={24} />
        Mumble
      </p>
      {mumbleCertificate ? (
        <>
          <p>Your Mumble certificate is linked, so you can join your games' voice channels</p>
          <div class="flex-1"></div>
          <a class="button" href="/mumble" data-umami-event="mumble-verify-again">
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
