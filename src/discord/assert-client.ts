import type { Client } from 'discord.js'

export function assertClient(client: Client | null): asserts client is Client {
  if (!client) {
    throw new Error('discord client unavailable')
  }
}
