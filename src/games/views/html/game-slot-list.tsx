import { collections } from '../../../database/collections'
import {
  PlayerConnectionStatus,
  SlotStatus,
  type GameSlotModel,
} from '../../../database/models/game-slot.model'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { tf2ClassOrder } from '../../../shared/tf2-class-order'
import { Tf2Team } from '../../../shared/types/tf2-team'

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

      <div class="slot-list">
        {slotPairs.map(({ red, blu, gameClass }) => (
          <>
            <GameSlot slot={blu!} side="left" gameState={props.game.state} />
            <GameClassIcon gameClass={gameClass} size={32} />
            <GameSlot slot={red!} side="right" gameState={props.game.state} />
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

async function GameSlot(props: {
  slot: GameSlotModel
  side: 'left' | 'right'
  gameState: GameState
}) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const player = await collections.players.findOne({ _id: props.slot.player })
  if (!player) {
    throw new Error(`no such player: ${props.slot.player}`)
  }

  const showConnectionState = [GameState.launching, GameState.started].includes(props.gameState)
  return (
    <a
      href={`/players/${player.steamId}`}
      class={[
        'bg-abru-light-75 hover:bg-abru-light-70 flex items-center gap-2.5 rounded p-2.5 transition-colors duration-75',
        props.side === 'right' && 'flex-row',
        props.side === 'left' && 'flex-row-reverse',
      ]}
    >
      <img src={player.avatar.medium} width="38" height="38" alt={`${player.name}'s avatar`} />
      <span class={['flex-1 text-xl font-medium', props.side === 'left' && 'text-end']} safe>
        {player.name}
      </span>
      {showConnectionState ? (
        <div
          class={[
            '-m-1 w-[6px] self-stretch rounded',
            {
              [PlayerConnectionStatus.connected]: 'online',
              [PlayerConnectionStatus.joining]: 'joining',
              [PlayerConnectionStatus.offline]: 'offline',
            }[props.slot.connectionStatus],
          ]}
        />
      ) : (
        <></>
      )}
    </a>
  )
}
