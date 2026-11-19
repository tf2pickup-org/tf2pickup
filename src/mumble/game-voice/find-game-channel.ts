import type { GameNumber } from '../../database/models/game.model'
import { mumbleVoiceServer } from './mumble-voice-server'

export async function findGameChannel(gameNumber: GameNumber) {
  return (await mumbleVoiceServer.gamesChannel())?.subChannels.find(
    ({ name }) => name === `${gameNumber}`,
  )
}
