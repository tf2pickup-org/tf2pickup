import type { GameNumber } from './game.model'

export interface DiscordSubstituteNotificationModel {
  guildId: string
  gameNumber: GameNumber
  slotId: string
  messageId: string
}
