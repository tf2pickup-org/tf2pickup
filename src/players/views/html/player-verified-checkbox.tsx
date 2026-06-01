import type { PlayerModel } from '../../../database/models/player.model'

export function PlayerVerifiedCheckbox(props: {
  player: Pick<PlayerModel, 'steamId' | 'verified'>
}) {
  const { player } = props
  return (
    <div
      id="player-verified-checkbox"
      class="bg-abru-light-5 flex shrink-0 items-center gap-3 rounded-md px-3 py-2"
    >
      <label for="playerVerified" class="cursor-pointer text-sm select-none">
        Player verified
      </label>
      <input
        type="checkbox"
        id="playerVerified"
        name="verified"
        value="true"
        checked={player.verified}
        hx-put={`/players/${player.steamId}/verify`}
        hx-trigger="change"
        hx-target="#player-verified-checkbox"
        hx-swap="outerHTML transition:false"
        hx-include="this"
        hx-disabled-elt="this"
      />
    </div>
  )
}
