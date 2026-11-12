import type { QueueSlotModel } from '../../../../database/models/queue-slot.model'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import type { Gamemode } from '../../../../shared/types/gamemode'

// Slots grouped by team for gamemodes with a team of two (rendered one row per team), empty otherwise.
export function teamSlots(gamemode: Gamemode, slots: QueueSlotModel[]): QueueSlotModel[][] {
  const config = gamemodeConfigs[gamemode]
  const positions = config.classes.flatMap(gameClass =>
    Array.from({ length: gameClass.count }, (_, classIndex) => ({
      gameClass: gameClass.name,
      classIndex,
    })),
  )
  if (positions.length !== 2) {
    return []
  }

  return Array.from({ length: config.teamCount }, (_, teamIndex) =>
    positions
      .map(
        position =>
          slots.filter(slot => slot.gameClass === position.gameClass)[
            position.classIndex * config.teamCount + teamIndex
          ],
      )
      .filter(slot => slot !== undefined),
  )
}
