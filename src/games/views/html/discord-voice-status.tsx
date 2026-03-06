import { configuration } from '../../../configuration'
import { collections } from '../../../database/collections'
import { SlotStatus } from '../../../database/models/game-slot.model'
import type { GameModel } from '../../../database/models/game.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { VoiceServerType } from '../../../shared/types/voice-server-type'

export async function DiscordVoiceStatus(props: {
  game: Pick<GameModel, 'number' | 'slots'>
  actor: SteamId64 | undefined
}) {
  if (!props.actor) {
    return <></>
  }

  const type = await configuration.get('games.voice_server_type')
  if (type !== VoiceServerType.discord) {
    return <></>
  }

  const slot = props.game.slots
    .filter(slot => [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(slot.status))
    .find(({ player }) => player === props.actor)
  if (!slot) {
    return <></>
  }

  if (slot.voiceServerUrl) {
    return (
      <p class="text-abru-light-50 text-sm">
        If the link does not open Discord, join your team voice channel manually in the configured
        Discord server.
      </p>
    )
  }

  const player = await collections.players.findOne(
    { steamId: props.actor },
    { projection: { discordProfile: 1 } },
  )
  if (!player?.discordProfile) {
    return (
      <p class="text-sm text-amber-300">
        Link your Discord account in <a href="/settings">settings</a> to access your team voice
        channel.
      </p>
    )
  }

  return (
    <p class="text-sm text-amber-300">
      Your linked Discord account could not be matched in the configured Discord server. Join the
      server manually or ask an admin to verify your membership.
    </p>
  )
}
