import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface MumbleVerificationCodeModel {
  code: string
  player: SteamId64
  expiresAt: Date
}
