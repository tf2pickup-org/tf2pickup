export interface DiscordBotStateModel {
  guildId: string
  // queue id → the message holding that queue's prompt
  promptMessageIds?: Record<string, string>
}
