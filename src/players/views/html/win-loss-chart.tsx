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

export async function WinLossChart(props: { steamId: SteamId64 }) {
  const allGames: GameResult[] = (
    await collections.games
      .find(
        { state: GameState.ended, 'slots.player': props.steamId, score: { $exists: true } },
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
    <div class="flex flex-col gap-2">
      <div class="flex flex-row justify-between">
        <div class="flex flex-row gap-4 text-ash">
          All
          <GameClassIcon gameClass={Tf2ClassName.scout} size={24} />
          <GameClassIcon gameClass={Tf2ClassName.soldier} size={24} />
          <GameClassIcon gameClass={Tf2ClassName.demoman} size={24} />
          <GameClassIcon gameClass={Tf2ClassName.medic} size={24} />
        </div>
        <div class="flex flex-row gap-4">
          <span class="text-game-result-win font-medium">
            W: {allGames.filter(({ result }) => result === 'win').length}
          </span>
          <span class="text-game-result-tie font-medium">
            T: {allGames.filter(({ result }) => result === 'tie').length}
          </span>
          <span class="text-game-result-loss font-medium">
            L: {allGames.filter(({ result }) => result === 'loss').length}
          </span>
        </div>
      </div>
      <div class="grid grid-cols-10 justify-around gap-1">
        {allGames.map(game => (
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
