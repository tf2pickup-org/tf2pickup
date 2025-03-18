import { collections } from '../database/collections'
import type { GameSlotId } from '../shared/types/game-slot-id'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { Tf2Team } from '../shared/types/tf2-team'

export async function up() {
  const gameClasses = [...Object.keys(Tf2ClassName)] as Tf2ClassName[]
  const games = await collections.games.find().toArray()
  for (const game of games) {
    const classCounts: Record<Tf2Team, Record<Tf2ClassName, number>> = {
      [Tf2Team.blu]: Object.fromEntries(gameClasses.map(gc => [gc, 1])) as Record<
        Tf2ClassName,
        number
      >,
      [Tf2Team.red]: Object.fromEntries(gameClasses.map(gc => [gc, 1])) as Record<
        Tf2ClassName,
        number
      >,
    }

    const slots = game.slots.map(slot => ({
      ...slot,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      id: `${slot.team}-${slot.gameClass}-${classCounts[slot.team][slot.gameClass]++}` as GameSlotId,
    }))
    await collections.games.updateOne(
      { _id: game._id },
      {
        $set: {
          slots,
        },
      },
    )
  }
}
