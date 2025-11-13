import fp from 'fastify-plugin'
import { createSocket } from 'node:dgram'
import { parseLogMessage } from '../parse-log-message'
import { logger } from '../../logger'
import { environment } from '../../environment'
import { events } from '../../events'
import { meter } from '../../otel'
import { ValueType } from '@opentelemetry/api'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    const messageCount = meter.createCounter('tf2pickup.log_receiver.message.count', {
      description: 'Messages coming to the log receiver',
      unit: '1',
      valueType: ValueType.INT,
    })
    const socket = createSocket('udp4')

    socket.on('message', message => {
      try {
        messageCount.add(1)
        const logMessage = parseLogMessage(message)
        events.emit('gamelog:message', { message: logMessage })
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // empty
      }
    })

    socket.on('listening', () => {
      const address = socket.address()
      logger.info(`log receiver listening at ${address.address}:${address.port}`)
    })

    socket.bind(environment.LOG_RELAY_PORT, '0.0.0.0')

    app.addHook('onClose', (_, done) => {
      socket.close(done)
    })
  },
  {
    name: 'log receiver',
  },
)
