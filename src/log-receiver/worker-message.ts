import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2Team } from '../shared/types/tf2-team'

export type WorkerMessage =
  | { type: 'match:started'; gameNumber: GameNumber }
  | { type: 'match:restarted'; gameNumber: GameNumber }
  | { type: 'match:ended'; gameNumber: GameNumber }
  | { type: 'match:roundWon'; gameNumber: GameNumber; winner: Tf2Team }
  | { type: 'match:roundLength'; gameNumber: GameNumber; lengthMs: number }
  | { type: 'match/logs:uploaded'; gameNumber: GameNumber; logsUrl: string }
  | {
      type: 'match/player:connected'
      gameNumber: GameNumber
      steamId: SteamId64
      ipAddress: string
    }
  | { type: 'match/player:joinedTeam'; gameNumber: GameNumber; steamId: SteamId64; team: Tf2Team }
  | { type: 'match/player:disconnected'; gameNumber: GameNumber; steamId: SteamId64 }
  | { type: 'match/player:said'; gameNumber: GameNumber; steamId: SteamId64; message: string }
  | { type: 'match/score:reported'; gameNumber: GameNumber; teamName: Tf2Team; score: number }
  | { type: 'match/score:final'; gameNumber: GameNumber; team: Tf2Team; score: number }
  | { type: 'match/demo:uploaded'; gameNumber: GameNumber; demoUrl: string }

export type ControlMessage = { type: 'shutdown' }
