import { collections } from '../database/collections'
import { SlotStatus, type GameSlotModel } from '../database/models/game-slot.model'
import { GameState, type GameNumber } from '../database/models/game.model'

interface SubstitutionRequest {
  gameNumber: GameNumber
  slot: GameSlotModel
}

export async function getSubstitutionRequests(): Promise<SubstitutionRequest[]> {
  const games = await collections.games
    .find({
      state: {
        $in: [GameState.created, GameState.configuring, GameState.launching, GameState.started],
      },
      'slots.status': SlotStatus.waitingForSubstitute,
    })
    .toArray()

  return games.flatMap(game => {
    return game.slots
      .filter(slot => slot.status === SlotStatus.waitingForSubstitute)
      .map(slot => ({ gameNumber: game.number, slot }))
  })
}
