import { configuration } from '../../configuration'
import { VoiceServerType } from '../../shared/types/voice-server-type'

export async function isMumble() {
  return (await configuration.get('games.voice_server_type')) === VoiceServerType.mumble
}
