import pino from 'pino'
import { logs } from '@opentelemetry/api-logs'
import { trace } from '@opentelemetry/api'
import type { Attributes } from '@opentelemetry/api'
import { environment } from './environment'

// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
const pinoLevelToSeverityNumber = (level: number) => {
  if (level >= 60) return 21 // FATAL
  if (level >= 50) return 17 // ERROR
  if (level >= 40) return 13 // WARN
  if (level >= 30) return 9  // INFO
  if (level >= 20) return 5  // DEBUG
  return 1                   // TRACE
}

const otelLogger = logs.getLogger('pino')

const otelStream = {
  write(line: string) {
    try {
      const log = JSON.parse(line) as { level: number; msg: string } & Record<string, unknown>
      const spanContext = trace.getActiveSpan()?.spanContext()
      otelLogger.emit({
        severityNumber: pinoLevelToSeverityNumber(log.level),
        body: log.msg,
        attributes: log as Attributes,
        ...(spanContext && {
          spanId: spanContext.spanId,
          traceId: spanContext.traceId,
          traceFlags: spanContext.traceFlags,
        }),
      })
    } catch {
      // ignore malformed lines
    }
  },
}

const stream =
  environment.NODE_ENV === 'production'
    ? pino.multistream([{ stream: process.stdout }, { stream: otelStream }])
    : pino.transport({ target: 'pino-princess' })

export const logger = pino({ level: environment.LOG_LEVEL }, stream)
