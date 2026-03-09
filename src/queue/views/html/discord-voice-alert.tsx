import { configuration } from '../../../configuration'
import { collections } from '../../../database/collections'
import type { PlayerModel } from '../../../database/models/player.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { VoiceServerType } from '../../../shared/types/voice-server-type'

export async function DiscordVoiceAlert(props: { actor?: SteamId64 | undefined }) {
  return (
    <div id="discord-voice-alert" class="contents">
      <DiscordVoiceAlertContent actor={props.actor} />
    </div>
  )
}

async function DiscordVoiceAlertContent(props: { actor?: SteamId64 | undefined }) {
  if (!props.actor) {
    return <></>
  }

  const type = await configuration.get('games.voice_server_type')
  if (type !== VoiceServerType.discord) {
    return <></>
  }

  const actor = await collections.players.findOne<Pick<PlayerModel, 'discordProfile'>>(
    { steamId: props.actor },
    { projection: { discordProfile: 1 } },
  )
  if (actor?.discordProfile) {
    return <></>
  }

  return (
    <div class="banner banner--warning">
      Link your Discord account in{' '}
      <a href="/settings">settings</a>
      {' '}to join the queue while Discord voice is enabled.
    </div>
  )
}
