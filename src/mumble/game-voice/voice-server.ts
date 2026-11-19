import type { Acl } from '@tf2pickup-org/mumble-client'

export interface VoiceChannel {
  readonly id: number
  readonly name: string | undefined
  readonly subChannels: VoiceChannel[]
  readonly userCount: number
  createSubChannel(name: string): Promise<VoiceChannel>
  saveAcl(acl: Acl): Promise<void>
  link(other: VoiceChannel): Promise<void>
  remove(): Promise<void>
}

export interface VoiceUser {
  readonly hash: string | undefined
  readonly channelId: number
  moveToChannel(channelId: number): Promise<void>
}

export interface VoiceServer {
  // undefined while the bot isn't connected
  gamesChannel(): Promise<VoiceChannel | undefined>
  users(): VoiceUser[]
}
