import { configuration } from '../configuration'
import { VoiceServerType } from '../shared/types/voice-server-type'

export async function isVerificationEnabled() {
  const [type, enabled] = await Promise.all([
    configuration.get('games.voice_server_type'),
    configuration.get('games.voice_server.mumble.player_verification'),
  ])
  return type === VoiceServerType.mumble && enabled
}
