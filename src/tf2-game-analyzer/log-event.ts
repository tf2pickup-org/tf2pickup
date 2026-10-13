// TODO: isolate SteamId64/Tf2Team into the module when tf2-game-analyzer is extracted
// to a standalone package; for now we reuse the app's shared types.
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2Team } from '../shared/types/tf2-team'

/**
 * A single interpreted game event produced by {@link analyze} from one TF2 log
 * line. A line may yield zero, one or several of these.
 */
export type LogEvent =
  | { event: 'round started' }
  | {
      event: 'round ended'
      winner: Tf2Team
      lengthMs: number
      score: Record<Tf2Team, number>
      captures: Record<Tf2Team, number[]>
    }
  | { event: 'teams swapped' }
  | { event: 'score reset' }
  | { event: 'match ended' }
  | { event: 'final score'; team: Tf2Team; score: number }
  | { event: 'player connected'; steamId: SteamId64; ipAddress: string }
  | { event: 'player joined team'; steamId: SteamId64; team: Tf2Team }
  | { event: 'player disconnected'; steamId: SteamId64 }
  | { event: 'player said'; steamId: SteamId64; message: string }
  | { event: 'logs uploaded'; logsUrl: string }
  | { event: 'demo uploaded'; demoUrl: string }
