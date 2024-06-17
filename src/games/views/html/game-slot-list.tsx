import { SlotStatus, type GameSlotModel } from '../../../database/models/game-slot.model'
import { type GameModel } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { tf2ClassOrder } from '../../../shared/tf2-class-order'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { GameSlot } from './game-slot'

export function GameSlotList(props: { game: GameModel }) {
  const activeSlots = props.game.slots.filter(slot =>
    [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(slot.status),
  )
  const slotPairs = makeSlotPairs(activeSlots)

  return (
    <>
      <div class="grid grid-cols-2 gap-[4px]">
        <div class="score-header blu">
          <span class="uppercase">blu</span>
          <span>{props.game.score?.blu ?? ''}</span>
        </div>

        <div class="score-header red">
          <span class="uppercase">red</span>
          <span>{props.game.score?.red ?? ''}</span>
        </div>
      </div>

      <div class="slot-list" id={`game-${props.game.number}-slots`}>
        {slotPairs.map(({ red, blu, gameClass }) => (
          <>
            <GameSlot slot={blu!} gameState={props.game.state} />
            <GameClassIcon gameClass={gameClass} size={32} />
            <GameSlot slot={red!} gameState={props.game.state} />
          </>
        ))}
      </div>
    </>
  )
}

function slotsForTeam(slots: GameSlotModel[], team: Tf2Team) {
  return slots
    .filter(slot => slot.team === team)
    .sort((a, b) => tf2ClassOrder[b.gameClass] - tf2ClassOrder[a.gameClass])
}

function makeSlotPairs(slots: GameSlotModel[]) {
  const blus = slotsForTeam(slots, Tf2Team.blu)
  const reds = slotsForTeam(slots, Tf2Team.red)

  const ret = []

  for (let i = 0; i < Math.max(blus.length, reds.length); ++i) {
    const blu = blus.at(i)
    const red = reds.at(i)
    const gameClass = blu ? blu.gameClass : red!.gameClass
    ret.push({ blu, red, gameClass })
  }

  return ret
}
