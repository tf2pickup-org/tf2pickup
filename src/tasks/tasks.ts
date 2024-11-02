import type { SteamId64 } from '../shared/types/steam-id-64'

export interface Tasks {
  'onlinePlayers:validatePlayer': (steamId: SteamId64) => Promise<void>
  'queue:readyUpTimeout': () => Promise<void>
  'queue:unready': () => Promise<void>
}

export const tasks: Partial<Tasks> = {}
export const timers = new Map<keyof Tasks, ReturnType<typeof setTimeout>>()
