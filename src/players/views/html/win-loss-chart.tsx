import { collections } from '../../../database/collections'
import { GameState, type GameNumber } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'

interface GameResult {
  result: 'win' | 'loss' | 'tie'
  gameNumber: GameNumber
}

export type ChartSelection = Tf2ClassName | 'all'

export async function WinLossChart(props: { steamId: SteamId64; selection?: ChartSelection }) {
  const selection = props.selection ?? 'all'
  const games: GameResult[] = (
    await collections.games
      .find(
        {
          state: GameState.ended,
          slots: {
            $elemMatch: {
              player: props.steamId,
              ...(selection === 'all' ? {} : { gameClass: selection }),
            },
          },
          score: { $exists: true },
        },
        { limit: 10, sort: { 'events.0.at': -1 } },
      )
      .toArray()
  ).map(game => {
    const playerSlot = game.slots.find(slot => slot.player === props.steamId)!
    const myScore = game.score![playerSlot.team]
    const opponentScore = game.score![playerSlot.team === Tf2Team.red ? Tf2Team.blu : Tf2Team.red]
    return {
      result: myScore > opponentScore ? 'win' : myScore < opponentScore ? 'loss' : 'tie',
      gameNumber: game.number,
    }
  })

  return (
    <div class="flex flex-col gap-2" id="win-loss-chart">
      <div class="flex flex-row justify-between">
        <div class="game-count-selection">
          <input
            type="radio"
            name="game-class-selection"
            id="all"
            value="all"
            checked={selection === 'all'}
          />
          <label for="all">All</label>

          <input
            type="radio"
            name="game-class-selection"
            id="scout"
            value={Tf2ClassName.scout}
            checked={selection === Tf2ClassName.scout}
          />
          <label for="scout">
            <span class="sr-only">Scout</span>
            <GameClassIcon gameClass={Tf2ClassName.scout} size={24} />
          </label>

          <input
            type="radio"
            name="game-class-selection"
            id="soldier"
            value={Tf2ClassName.soldier}
            checked={selection === Tf2ClassName.soldier}
          />
          <label for="soldier">
            <span class="sr-only">Soldier</span>
            <GameClassIcon gameClass={Tf2ClassName.soldier} size={24} />
          </label>

          <input
            type="radio"
            name="game-class-selection"
            id="demoman"
            value={Tf2ClassName.demoman}
            checked={selection === Tf2ClassName.demoman}
          />
          <label for="demoman">
            <span class="sr-only">Demoman</span>
            <GameClassIcon gameClass={Tf2ClassName.demoman} size={24} />
          </label>

          <input
            type="radio"
            name="game-class-selection"
            id="medic"
            value={Tf2ClassName.medic}
            checked={selection === Tf2ClassName.medic}
          />
          <label for="medic">
            <span class="sr-only">Medic</span>
            <GameClassIcon gameClass={Tf2ClassName.medic} size={24} />
          </label>
        </div>
        <div class="game-count">
          <span class="sr-only">Wins</span>
          <span class="wins">W: {games.filter(({ result }) => result === 'win').length}</span>
          <span class="sr-only">Ties</span>
          <span class="ties">T: {games.filter(({ result }) => result === 'tie').length}</span>
          <span class="sr-only">Losses</span>
          <span class="losses">L: {games.filter(({ result }) => result === 'loss').length}</span>
        </div>
      </div>
      <div class="grid grid-cols-10 justify-around gap-1">
        {games.map(game => (
          <div class={`game-result ${game.result}`}>
            <span class="tooltip tooltip--bottom whitespace-nowrap" safe>
              #{game.gameNumber}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
