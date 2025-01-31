import { assertClient } from './assert-client'
import { client } from './client'

export async function getGuilds() {
  assertClient(client)
  return client.guilds.cache.map(({ id, name }) => ({ id, name }))
}
