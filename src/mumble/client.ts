import { Client } from '@tf2pickup-org/mumble-client'
import { configuration } from '../configuration'
import { VoiceServerType } from '../shared/types/voice-server-type'
import { logger } from '../logger'
import { certificates } from '../certificates'
import { moveToTargetChannel } from './move-to-target-channel'
import { assertClientIsConnected } from './assert-client-is-connected'
import { version } from '../version'
import { MumbleClientStatus, setStatus } from './status'
import { errors } from '../errors'

export let client: Client | undefined

export async function tryConnect() {
  client?.disconnect()
  setStatus(MumbleClientStatus.disconnected)

  const type = await configuration.get('games.voice_server_type')
  if (type !== VoiceServerType.mumble) {
    return
  }

  const [host, port, channelName, password] = await Promise.all([
    configuration.get('games.voice_server.mumble.url'),
    configuration.get('games.voice_server.mumble.port'),
    configuration.get('games.voice_server.mumble.channel_name'),
    configuration.get('games.voice_server.mumble.password'),
  ])
  if (!host) {
    throw errors.internalServerError(`mumble configuration malformed`)
  }

  logger.info({ host, port, channelName }, `connecting to mumble server...`)
  setStatus(MumbleClientStatus.connecting)
  try {
    const { clientKey, certificate } = await certificates.get('mumble')
    client = new Client({
      host,
      port,
      username: 'tf2pickup.org bot',
      ...(password ? { password } : {}),
      clientName: `tf2pickup.org ${version}`,
      key: clientKey,
      cert: certificate,
      rejectUnauthorized: false,
    })

    await client.connect()
    assertClientIsConnected(client)
    logger.info(
      {
        mumbleUser: {
          name: client.user.name,
        },
        welcomeText: client.welcomeText,
      },
      `connected to the mumble server`,
    )

    await client.user.setSelfDeaf(true)
    await moveToTargetChannel()

    const permissions = await client.user.channel.getPermissions()
    if (!permissions.canCreateChannel) {
      logger.warn(`bot ${client.user.name} does not have permissions to create new channels`)
    }
    setStatus(MumbleClientStatus.connected)
  } catch (error) {
    setStatus(MumbleClientStatus.error)
    throw error
  }
}
