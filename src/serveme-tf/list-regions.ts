import { findServers } from './find-servers'

export async function listRegions(): Promise<string[]> {
  const servers = await findServers()
  return [...new Set(servers.map(({ flag }) => flag))]
}
