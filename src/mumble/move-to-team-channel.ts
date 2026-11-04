import { collections } from '../database/collections'
import { SlotStatus } from '../database/models/game-slot.model'
import { GameState } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { client } from './client'
import { findGameChannels } from './find-game-channels'
import { runInCommandQueue } from './run-in-command-queue'

// moves a just-verified player who's on Mumble into their team channel
export async function moveToTeamChannel(player: SteamId64, hash: string) {
  const user = client?.users.findAll(user => user.hash === hash)[0]
  if (!user) {
    return
  }

  const game = await collections.games.findOne(
    {
      state: {
        $in: [GameState.created, GameState.configuring, GameState.launching, GameState.started],
      },
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

  await runInCommandQueue(async () => await user.moveToChannel(channels[team].id))
}
