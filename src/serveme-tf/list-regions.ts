import { getClient } from './client'

export async function listRegions() {
  const client = await getClient()
  if (!client) {
    throw new Error(`serveme.tf disabled`)
  }

  const { servers } = await client.findOptions()
  return [...new Set(servers.map(({ flag }) => flag))]
}
