import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { PlayerSkill } from './player.model'

export interface PlayerNameChangeEntry {
  type: 'player name change'
  timestamp: Date
  player: SteamId64
  oldName: string
  newName: string
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
  actor: SteamId64
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
  admin: SteamId64
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
}

export type ActivityLogEntryModel =
  | PlayerNameChangeEntry
  | PlayerSkillChangeEntry
  | ConfigurationChangeEntry
  | BanAddedEntry
  | BanRevokedEntry
  | MapPoolChangeEntry
  | MapScrambleEntry

export type ActivityLogEntryType = ActivityLogEntryModel['type']

export type ActivityLogInput =
  | Omit<PlayerNameChangeEntry, 'timestamp'>
  | Omit<PlayerSkillChangeEntry, 'timestamp'>
  | Omit<ConfigurationChangeEntry, 'timestamp'>
  | Omit<BanAddedEntry, 'timestamp'>
  | Omit<BanRevokedEntry, 'timestamp'>
  | Omit<MapPoolChangeEntry, 'timestamp'>
  | Omit<MapScrambleEntry, 'timestamp'>
