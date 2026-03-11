import { nanoid } from 'nanoid'
import { secondsToMilliseconds } from 'date-fns'
import { events } from '../events'
import { environment } from '../environment'
import type { StaticGameServerModel } from '../database/models/static-game-server.model'
import type { LogMessage } from '../log-receiver/parse-log-message'
import { withRconForServer } from './with-rcon-for-server'
import { updatePhase, completeCheck, getCheck } from './healthcheck-store'
import { assertIsError } from '../utils/assert-is-error'

export async function runHealthcheck(
  server: StaticGameServerModel,
  checkId: string,
): Promise<void> {
  try {
    updatePhase(checkId, 'rconConnect', { status: 'running' })

    await withRconForServer(server, async ({ rcon }) => {
      updatePhase(checkId, 'rconConnect', { status: 'ok' })

      // Phase 2: RCON command
      updatePhase(checkId, 'rconCommand', { status: 'running' })
      try {
        await rcon.send('status')
        updatePhase(checkId, 'rconCommand', { status: 'ok' })
      } catch (error) {
        assertIsError(error)
        updatePhase(checkId, 'rconCommand', { status: 'fail', message: error.message })
        return
      }

      // Phase 3: Log round-trip
      updatePhase(checkId, 'logRoundTrip', { status: 'running' })

      const logSecret = nanoid(16)
      const probe = nanoid(16)

      let resolveLog!: () => void
      const logReceived = new Promise<void>(resolve => {
        resolveLog = resolve
      })

      const handler = ({ message }: { message: LogMessage }) => {
        if (message.password === logSecret && message.payload.includes(probe)) {
          events.off('gamelog:message', handler)
          resolveLog()
        }
      }
      events.on('gamelog:message', handler)

      try {
        await rcon.send(
          `logaddress_add ${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`,
        )
        await rcon.send(`sv_logsecret ${logSecret}`)
        const probeTime = Date.now()
        await rcon.send(`say tf2pickup-healthcheck-${probe}`)

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), secondsToMilliseconds(10)),
        )

        try {
          await Promise.race([logReceived, timeout])
          updatePhase(checkId, 'logRoundTrip', {
            status: 'ok',
            message: `received in ${Date.now() - probeTime}ms`,
          })
        } catch {
          events.off('gamelog:message', handler)
          updatePhase(checkId, 'logRoundTrip', {
            status: 'fail',
            message: 'no log received within 10s',
          })
        }
      } finally {
        await rcon.send(
          `logaddress_del ${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`,
        )
        await rcon.send('sv_logsecret 0')
      }
    })
  } catch (error) {
    assertIsError(error)
    // Only mark rconConnect as failed if it's still 'running' — errors thrown
    // from the cleanup finally block (logaddress_del, sv_logsecret 0) should
    // not overwrite phases that already completed.
    if (getCheck(checkId)?.phases.rconConnect.status === 'running') {
      updatePhase(checkId, 'rconConnect', { status: 'fail', message: error.message })
    }
  } finally {
    completeCheck(checkId)
  }
}
