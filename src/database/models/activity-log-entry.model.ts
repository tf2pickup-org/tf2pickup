import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GameNumber } from './game.model'
import type { PlayerSkill } from './player.model'

export interface PlayerNameChangeEntry {
  type: 'player name change'
  timestamp: Date
  player: SteamId64
  oldName: string
  newName: string
  actor?: SteamId64
}

export interface PlayerSkillChangeEntry {
  type: 'player skill change'
  timestamp: Date
  player: SteamId64
  oldSkill: PlayerSkill
  newSkill: PlayerSkill
  actor: SteamId64
}

export interface ConfigurationChangeEntry {
  type: 'configuration change'
  timestamp: Date
  key: string
  actor: SteamId64 | 'bot'
}

export interface BanAddedEntry {
  type: 'ban added'
  timestamp: Date
  player: SteamId64
  actor: SteamId64 | 'bot'
  reason: string
  start: Date
  end: Date
}

export interface BanRevokedEntry {
  type: 'ban revoked'
  timestamp: Date
  player: SteamId64
  actor: SteamId64
  reason: string
}

export interface ChatMuteAddedEntry {
  type: 'chat mute added'
  timestamp: Date
  player: SteamId64
  actor: SteamId64 | 'bot'
  reason: string
  start: Date
  end: Date
}

export interface ChatMuteRevokedEntry {
  type: 'chat mute revoked'
  timestamp: Date
  player: SteamId64
  actor: SteamId64
  reason: string
}

export interface MapPoolChangeEntry {
  type: 'map pool change'
  timestamp: Date
  maps: string[]
}

export interface MapScrambleEntry {
  type: 'map scramble'
  timestamp: Date
  actor: SteamId64
  maps: string[]
  count: number
}

export interface GameReconfiguredEntry {
  type: 'game reconfigured'
  timestamp: Date
  gameNumber: GameNumber
  actor?: SteamId64
}

export interface GameServerReassignedEntry {
  type: 'game server reassigned'
  timestamp: Date
  gameNumber: GameNumber
  gameServer: string
  actor?: SteamId64
}

export interface GameForceEndedEntry {
  type: 'game force-ended'
  timestamp: Date
  gameNumber: GameNumber
  actor?: SteamId64 | 'bot'
}

export interface SubstituteRequestedEntry {
  type: 'substitute requested'
  timestamp: Date
  gameNumber: GameNumber
  player: SteamId64
  actor: SteamId64 | 'bot'
  gameClass: Tf2ClassName
  reason?: string
}

export interface QueueClearedEntry {
  type: 'queue cleared'
  timestamp: Date
  actor: SteamId64
  playerCount: number
}

export type ActivityLogEntryModel =
  | PlayerNameChangeEntry
  | PlayerSkillChangeEntry
  | ConfigurationChangeEntry
  | BanAddedEntry
  | BanRevokedEntry
  | ChatMuteAddedEntry
  | ChatMuteRevokedEntry
  | MapPoolChangeEntry
  | MapScrambleEntry
  | GameReconfiguredEntry
  | GameServerReassignedEntry
  | GameForceEndedEntry
  | SubstituteRequestedEntry
  | QueueClearedEntry

export type ActivityLogEntryType = ActivityLogEntryModel['type']

export type ActivityLogInput =
  | Omit<PlayerNameChangeEntry, 'timestamp'>
  | Omit<PlayerSkillChangeEntry, 'timestamp'>
  | Omit<ConfigurationChangeEntry, 'timestamp'>
  | Omit<BanAddedEntry, 'timestamp'>
  | Omit<BanRevokedEntry, 'timestamp'>
  | Omit<ChatMuteAddedEntry, 'timestamp'>
  | Omit<ChatMuteRevokedEntry, 'timestamp'>
  | Omit<MapPoolChangeEntry, 'timestamp'>
  | Omit<GameReconfiguredEntry, 'timestamp'>
  | Omit<GameServerReassignedEntry, 'timestamp'>
  | Omit<GameForceEndedEntry, 'timestamp'>
  | Omit<SubstituteRequestedEntry, 'timestamp'>
  | Omit<QueueClearedEntry, 'timestamp'>
