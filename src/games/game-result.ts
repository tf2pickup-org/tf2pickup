import { GameState, type GameModel } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2Team } from '../shared/types/tf2-team'

export type GameResult = 'win' | 'loss' | 'tie' | 'interrupted'

// How the game went for the given player; undefined while it's running or without a score.
export function gameResult(
  game: Pick<GameModel, 'state' | 'score' | 'slots'>,
  player: SteamId64,
): GameResult | undefined {
  if (game.state === GameState.interrupted) {
    return 'interrupted'
  }

  const team = game.slots.find(slot => slot.player === player)?.team
  if (game.state !== GameState.ended || !game.score || !team) {
    return undefined
  }

  const own = game.score[team]
  const opponent = game.score[team === Tf2Team.red ? Tf2Team.blu : Tf2Team.red]
  return own > opponent ? 'win' : own < opponent ? 'loss' : 'tie'
}
