import { configuration } from '../configuration'

export async function getServerId() {
  const [url, port] = await Promise.all([
    configuration.get('games.voice_server.mumble.url'),
    configuration.get('games.voice_server.mumble.port'),
  ])
  return `${url}:${port}`
}
