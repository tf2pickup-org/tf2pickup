import { millisecondsToSeconds, secondsToMilliseconds } from 'date-fns'
import { withTimeout } from 'es-toolkit'
import type { GameNumber } from '../../database/models/game.model'
import { environment } from '../../environment'
import { events } from '../../events'
import type { LogMessage } from '../../log-receiver/parse-log-message'
import { logger } from '../../logger'
import type { Rcon } from './with-rcon'

const verifyTimeout = secondsToMilliseconds(5)
const triggerInterval = secondsToMilliseconds(1)

export async function verifyLogTransmission(args: {
  rcon: Rcon
  logSecret: string
  gameNumber: GameNumber
  signal?: AbortSignal | undefined
}): Promise<void> {
  const { rcon, logSecret, gameNumber, signal } = args
  const logAddress = `${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`
  logger.debug(`game #${gameNumber}: verifying log transmission to ${logAddress}...`)

  let listener!: (params: { message: LogMessage }) => void
  const received = new Promise<void>(resolve => {
    listener = ({ message }) => {
      if (message.password === logSecret) {
        resolve()
      }
    }
    events.on('gamelog:message', listener)
  })

  try {
    await rcon.send('log on')
    const attempts = Math.floor(verifyTimeout / triggerInterval)
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (signal?.aborted) {
        throw new Error(`${signal.reason}`)
      }
      await rcon.send(`echo tf2pickup log check`)
      try {
        await withTimeout(() => received, triggerInterval)
        logger.debug(`game #${gameNumber}: log transmission verified`)
        return
      } catch {
        // `received` never rejects, so this can only be the TimeoutError
      }
    }

    throw new Error(
      `game server is not sending logs to ${logAddress}: no log message received within ` +
        `${millisecondsToSeconds(verifyTimeout)} seconds of logaddress_add; make sure the game server can reach ` +
        `${logAddress} over UDP (firewall) and that the LOG_RELAY_PORT port mapping is correct (docker)`,
    )
  } finally {
    events.off('gamelog:message', listener)
  }
}
