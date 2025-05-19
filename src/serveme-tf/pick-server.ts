import type { ServerId } from '@tf2pickup-org/serveme-tf-client'
import { configuration } from '../configuration'
import { sample } from 'es-toolkit'
import { errors } from '../errors'

interface ServerData {
  id: ServerId
  flag: string
  name: string
}

export async function pickServer(servers: ServerData[], name?: string): Promise<ServerId> {
  if (name) {
    if (name.startsWith('anyOf:')) {
      const anyOf = name.substring(6)
      const server = servers.find(({ name }) => name.startsWith(anyOf))
      if (!server) {
        throw errors.notFound('could not find any gameservers meeting given criteria')
      }

      return server.id
    }

    const server = servers.find(server => server.name === name)
    if (!server) {
      throw errors.notFound(`could not find gameserver named ${name}`)
    }

    return server.id
  }

  const bannedServers = await configuration.get('serveme_tf.ban_gameservers')

  const validServers = (await byFilterRegion(servers)).filter(s =>
    bannedServers.every(ban => !s.name.includes(ban)),
  )

  if (validServers.length === 0) {
    throw errors.notFound('could not find any gameservers meeting given criteria')
  }

  const server = sample(validServers)
  return server.id
}

async function byFilterRegion(servers: ServerData[]): Promise<ServerData[]> {
  const preferredRegion = await configuration.get('serveme_tf.preferred_region')
  if (preferredRegion === null) {
    return servers
  }

  const matching = servers.filter(s => s.flag === preferredRegion)
  if (matching.length === 0) {
    return servers
  } else {
    return matching
  }
}
