import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

export interface Tasks {
  'onlinePlayers:validatePlayer': (steamId: SteamId64) => Promise<void>
  'games:autoSubstitutePlayer': (gameNumber: GameNumber, steamId: SteamId64) => Promise<void>
  'queue:readyUpTimeout': () => Promise<void>
  'queue:unready': () => Promise<void>
}

export const tasks: Partial<Tasks> = {}

interface TimerInfo {
  name: keyof Tasks
  args: unknown
  timer: ReturnType<typeof setTimeout>
}
export const timers: TimerInfo[] = []
