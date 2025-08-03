import { collections } from '../../../database/collections'
import { GameState, type GameModel, type GameNumber } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { queue } from '../../../queue'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'

interface GameResult {
  result: 'win' | 'loss' | 'tie'
  score: NonNullable<GameModel['score']>
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
        { limit: 12, sort: { 'events.0.at': -1 } },
      )
      .toArray()
  ).map(game => {
    const playerSlot = game.slots.find(slot => slot.player === props.steamId)!
    const myScore = game.score![playerSlot.team]
    const opponentScore = game.score![playerSlot.team === Tf2Team.red ? Tf2Team.blu : Tf2Team.red]
    return {
      result: myScore > opponentScore ? 'win' : myScore < opponentScore ? 'loss' : 'tie',
      score: game.score!,
      gameNumber: game.number,
    }
  })

  return (
    <div class="flex flex-col gap-2" id="win-loss-chart">
      <div class="flex flex-row justify-between">
        <div class="game-count-selection">
          <button
            type="button"
            hx-get={`/players/${props.steamId}/win-loss-chart/all`}
            hx-target="#win-loss-chart"
            hx-swap="outerHTML"
            class={[selection === 'all' && 'selected']}
            role="tab"
            aria-selected={selection === 'all'}
          >
            All
          </button>

          {queue.config.classes.map(({ name }) => (
            <button
              type="button"
              hx-get={`/players/${props.steamId}/win-loss-chart/${name}`}
              hx-target="#win-loss-chart"
              hx-swap="outerHTML"
              class={[selection === name && 'selected']}
              role="tab"
              aria-selected={selection === name}
            >
              <span class="sr-only">{name}</span>
              <GameClassIcon gameClass={name} size={24} />
            </button>
          ))}
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
      <div class="grid min-h-[24px] grid-cols-12 justify-around gap-1">
        {games.map(game => (
          <a class={`game-result ${game.result}`} href={`/games/${game.gameNumber}`}>
            <div class="tooltip tooltip--bottom flex flex-col whitespace-nowrap">
              <span safe>#{game.gameNumber}</span>
              <div>
                <span class="text-team-blu">{game.score[Tf2Team.blu]}</span>{' '}
                <span class="text-ash">:</span>{' '}
                <span class="text-team-red">{game.score[Tf2Team.red]}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
