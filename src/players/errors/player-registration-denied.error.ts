import type { SteamId64 } from '../../shared/types/steam-id-64'

export class PlayerRegistrationDeniedError extends Error {
  constructor(
    public readonly steamId: SteamId64,
    public override readonly message: string,
  ) {
    super(`registration denied for ${steamId} (${message})`)
  }
}
