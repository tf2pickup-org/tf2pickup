import type { GameContext } from '../../tf2-game-analyzer/game-context'
import type { GameNumber } from './game.model'

/**
 * Persisted parse state for a single game's log stream. The tf2-game-analyzer
 * {@link GameContext} is a plain, serializable blob that the log parser reads,
 * mutates and writes back for every log line. It supersedes the old
 * games.roundprogress document: all in-progress state (round assembly, the
 * pending stopwatch side-swap, restart detection, the running score) lives
 * inside `context`. `at` is refreshed on every write and drives a TTL index that
 * sweeps the document a day after the game's log traffic stops.
 */
export interface GameLogParseStateModel {
  gameNumber: GameNumber
  context: GameContext
  at: Date
}
