import { SlotStatus } from '../../database/models/game-slot.model'
import type { GameModel } from '../../database/models/game.model'
import { syncGameAcl } from './sync-game-acl'

export async function sync(
  game: Pick<GameModel, 'number' | 'state' | 'slots'>,
  before?: Pick<GameModel, 'slots'>,
) {
  if (before && occupancy(before) === occupancy(game)) {
    return
  }

  await syncGameAcl(game)
}

function occupancy({ slots }: Pick<GameModel, 'slots'>) {
  return slots
    .filter(({ status }) => [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(status))
    .map(({ player, team, voiceOutgoing }) => `${player}:${team}:${voiceOutgoing?.join('+')}`)
    .sort()
    .join()
}
