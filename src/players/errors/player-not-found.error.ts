import type { SteamId64 } from '../../shared/types/steam-id-64'

export class PlayerNotFoundError extends Error {
  constructor(public readonly steamId: SteamId64) {
    super(`player ${steamId} not found`)
  }
}
