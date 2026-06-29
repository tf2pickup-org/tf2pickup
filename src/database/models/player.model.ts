import type { Bot } from '../../shared/types/bot'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Gamemode } from '../../shared/types/gamemode'
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
  anonymous?: boolean
}

export interface TwitchTvProfile {
  userId: string
  login: string
  displayName: string
  profileImageUrl: string
}

export interface Etf2lProfile {
  id: number
  name: string
  country: string
}

// Per-class counts/values within a single gamemode.
export type ClassCount = Partial<Record<Tf2ClassName, number>>

export interface PlayerStats {
  totalGames: number
  gamesByGamemode: Partial<Record<Gamemode, number>>
  gamesByClass: Partial<Record<Gamemode, ClassCount>>
}

// A single gamemode's class→skill / class→elo map.
export type PlayerSkill = Partial<Record<Tf2ClassName, number>>

export type PlayerElo = Partial<Record<Tf2ClassName, number>>

// The full per-gamemode storage shape on the player document.
export type PlayerSkillByGamemode = Partial<Record<Gamemode, PlayerSkill>>

export type PlayerEloByGamemode = Partial<Record<Gamemode, PlayerElo>>

export interface PlayerModel {
  name: string
  steamId: SteamId64
  joinedAt: Date
  avatar: PlayerAvatar
  avatarLastSyncedAt?: Date
  roles: PlayerRole[]
  hasAcceptedRules: boolean
  etf2lProfile?: Etf2lProfile
  etf2lProfileLastSyncedAt?: Date
  cooldownLevel: number
  activeGame?: GameNumber
  skill?: PlayerSkillByGamemode
  skillHistory?: {
    at: Date
    gamemode: Gamemode
    skill: PlayerSkill
    actor: SteamId64
    lastGame?: GameNumber | undefined
    // Snapshot of stats.gamesByClass[gamemode] at the time of the skill change.
    // Used by skill suggestion cooldown: compare against current counts to know
    // how many games have been played since the last edit, without an extra query.
    gamesByClass?: ClassCount
  }[]
  nameHistory?: {
    name: string
    changedAt: Date
  }[]
  preReadyUntil?: Date
  preferences: PlayerPreferences
  bans?: PlayerBan[]
  chatMutes?: PlayerBan[]
  verified?: boolean
  twitchTvProfile?: TwitchTvProfile
  stats: PlayerStats
  elo?: PlayerEloByGamemode
  eloHistory?: {
    at: Date
    gamemode: Gamemode
    elo: PlayerElo
    game: GameNumber
  }[]
}
