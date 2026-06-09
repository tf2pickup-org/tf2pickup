import { Mutex } from 'async-mutex'
import type { SteamId64 } from '../shared/types/steam-id-64'

const mutexes = new Map<SteamId64, Mutex>()

export function forPlayer(steamId: SteamId64): Mutex {
  let m = mutexes.get(steamId)
  if (m === undefined) {
    m = new Mutex()
    mutexes.set(steamId, m)
  }
  return m
}
