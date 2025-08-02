import { type GameModel } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { queue } from '../../../queue'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { GameScore } from './game-score'
import { GameSlot } from './game-slot'

export function GameSlotList(props: { game: GameModel; actor?: SteamId64 | undefined }) {
  return (
    <>
      <div class="score-header team-blu">
        <span class="uppercase">blu</span>
        <GameScore game={props.game} team={Tf2Team.blu} />
      </div>

      <div class="slot-list team-blu" id={`game-${props.game.number}-slots-blu`}>
        {props.game.slots
          .filter(slot => slot.team === Tf2Team.blu)
          .map(slot => (
            <GameSlot slot={slot} game={props.game} actor={props.actor} />
          ))}
      </div>

      <div class="game-class-icons">
        {queue.config.classes.map(c => {
          const ret: JSX.Element[] = []
          for (let i = 0; i < c.count; ++i) {
            ret.push(<GameClassIcon gameClass={c.name} size={32} />)
          }
          return ret
        })}
      </div>

      <div class="score-header team-red">
        <span class="uppercase">red</span>
        <GameScore game={props.game} team={Tf2Team.red} />
      </div>

      <div class="slot-list team-red" id={`game-${props.game.number}-slots-red`}>
        {props.game.slots
          .filter(slot => slot.team === Tf2Team.red)
          .map(slot => (
            <GameSlot slot={slot} game={props.game} actor={props.actor} />
          ))}
      </div>
    </>
  )
}

GameSlotList.refreshAll = function (props: { game: GameModel; actor?: SteamId64 | undefined }) {
  return (
    <>
      {props.game.slots.map(slot => (
        <GameSlot slot={slot} game={props.game} actor={props.actor} />
      ))}
    </>
  )
}
