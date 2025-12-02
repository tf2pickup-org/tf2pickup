import type { Bot } from '../../shared/types/bot'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GameNumber } from './game.model'

export interface PlayerAvatar {
  small: string
  medium: string
  large: string
}

export enum PlayerRole {
  superUser = 'super user',
  admin = 'admin',
}

export interface PlayerPreferences {
  soundVolume?: number
}

export interface PlayerBan {
  actor: SteamId64 | Bot
  start: Date
  end: Date
  reason: string
}

export interface TwitchTvProfile {
  userId: string
  login: string
  displayName: string
  profileImageUrl: string
}

export interface PlayerStats {
  totalGames: number
  gamesByClass: Partial<Record<Tf2ClassName, number>>
}

export interface PlayerModel {
  name: string
  steamId: SteamId64
  joinedAt: Date
  avatar: PlayerAvatar
  roles: PlayerRole[]
  hasAcceptedRules: boolean
  etf2lProfileId?: number
  etf2lProfileLastSyncedAt?: Date
  cooldownLevel: number
  activeGame?: GameNumber
  skill?: Partial<Record<Tf2ClassName, number>>
  preReadyUntil?: Date
  preferences: PlayerPreferences
  bans?: PlayerBan[]
  twitchTvProfile?: TwitchTvProfile
  stats: PlayerStats
}
