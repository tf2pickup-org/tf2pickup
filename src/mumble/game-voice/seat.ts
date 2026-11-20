import { collections } from '../../database/collections'
import { SlotStatus } from '../../database/models/game-slot.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { isVerificationEnabled } from '../is-verification-enabled'
import { findGameChannels } from './find-game-channels'
import { runningGameStates } from '../../games/lifecycle/running-game-states'
import { mumbleVoiceServer } from './mumble-voice-server'

// moves a just-verified player who's on Mumble into their team channel
export async function seat(player: SteamId64, hash: string) {
  const user = mumbleVoiceServer.users().find(user => user.hash === hash)
  if (!user || !(await isVerificationEnabled())) {
    return
  }

  const game = await collections.games.findOne(
    {
      state: { $in: runningGameStates },
      slots: {
        $elemMatch: {
          player,
          status: { $in: [SlotStatus.active, SlotStatus.waitingForSubstitute] },
        },
      },
    },
    { projection: { number: 1, slots: 1 } },
  )
  const team = game?.slots.find(slot => slot.player === player)?.team
  const channels = game && (await findGameChannels(game.number))
  if (!team || !channels || user.channelId === channels[team].id) {
    return
  }

  await user.moveToChannel(channels[team].id)
}
