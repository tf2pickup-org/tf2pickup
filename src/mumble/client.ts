import { Client } from '@tf2pickup-org/mumble-client'
import { secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { configuration } from '../configuration'
import { VoiceServerType } from '../shared/types/voice-server-type'
import { logger } from '../logger'
import { certificates } from '../certificates'
import { moveToTargetChannel } from './move-to-target-channel'
import { assertClientIsConnected } from './assert-client-is-connected'
import { version } from '../version'
import { MumbleClientStatus, setStatus } from './status'
import { events } from '../events'
import { errors } from '../errors'

export let client: Client | undefined

const maxReconnectAttempts = 3
const reconnectDelay = secondsToMilliseconds(1)

export async function tryConnect() {
  client?.disconnect()
  setStatus(MumbleClientStatus.disconnected)

  const type = await configuration.get('games.voice_server_type')
  if (type !== VoiceServerType.mumble) {
    return
  }

  const [url, internalUrl, port, channelName, password] = await Promise.all([
    configuration.get('games.voice_server.mumble.url'),
    configuration.get('games.voice_server.mumble.internal_url'),
    configuration.get('games.voice_server.mumble.port'),
    configuration.get('games.voice_server.mumble.channel_name'),
    configuration.get('games.voice_server.mumble.password'),
  ])
  if (!url) {
    throw errors.internalServerError(`mumble configuration malformed`)
  }

  const host = internalUrl ?? url

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

    let attempt = 0
    let reconnecting = false
    const localClient = client
    client.on('error', async (error: unknown) => {
      if (!isSocketError(error)) {
        logger.error(error, 'mumble client error')
        reportError(error)
        return
      }

      if (reconnecting) return
      reconnecting = true

      attempt += 1
      if (attempt > maxReconnectAttempts) {
        logger.error(error, 'mumble socket error')
        reportError(error)
        return // reconnecting stays true — suppresses further events after exhaustion
      }

      logger.warn(
        error,
        `mumble socket error, reconnect attempt ${attempt}/${maxReconnectAttempts}...`,
      )
      await delay(reconnectDelay)
      reconnecting = false // release before connecting so the next error event can trigger a new retry

      try {
        await localClient.connect()
        await afterConnect()
        attempt = 0
      } catch (reconnectError) {
        logger.error(reconnectError, 'mumble reconnect error')
        reportError(reconnectError)
        reconnecting = true // suppress further events on non-socket error
      }
    })

    await client.connect()
    await afterConnect()
  } catch (error) {
    reportError(error)
    throw error
  }
}

function reportError(error: unknown) {
  setStatus(MumbleClientStatus.error)
  events.emit('mumble/error', { error })
}

async function afterConnect() {
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
}

function isSocketError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.message === 'socket not writable') {
    return true
  }

  return (
    'code' in error &&
    typeof error.code === 'string' &&
    [
      'ECONNRESET',
      'ECONNREFUSED',
      'EHOSTDOWN',
      'EHOSTUNREACH',
      'ENETDOWN',
      'ENETRESET',
      'ENETUNREACH',
      'ENOTFOUND',
      'EPIPE',
      'ETIMEDOUT',
    ].includes(error.code)
  )
}
