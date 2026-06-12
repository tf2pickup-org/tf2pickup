import { collections } from '../../../database/collections'
import { IconCrown } from '../../../html/components/icons'
import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { isEligibleCaptain } from '../../is-eligible-captain'

export async function WantsCaptainToggle(props: { actor?: SteamId64 | undefined }) {
  if (!props.actor) return <div id="wants-captain-toggle" />

  const player = await collections.queuePlayers.findOne({ steamId: props.actor })
  if (!player) return <div id="wants-captain-toggle" />

  const profile = await players.bySteamId(props.actor, ['stats'])
  const eligible = await isEligibleCaptain(profile)
  if (!eligible) return <div id="wants-captain-toggle" />

  return (
    <label id="wants-captain-toggle" class="wants-captain-toggle" ws-send>
      <input
        type="checkbox"
        checked={player.wantsCaptain}
        ws-send
        hx-trigger="change"
        hx-vals={JSON.stringify({ wantsCaptain: player.wantsCaptain ? 'false' : 'true' })}
        data-umami-event="captain-toggle"
      />
      <IconCrown size={18} />
      <span>I want to be captain</span>
    </label>
  )
}
