import pino from 'pino'
import { logs } from '@opentelemetry/api-logs'
import { trace } from '@opentelemetry/api'
import type { AttributeValue, Attributes } from '@opentelemetry/api'
import { environment } from './environment'

// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
const pinoLevelToSeverityNumber = (level: number) => {
  if (level >= 60) return 21 // FATAL
  if (level >= 50) return 17 // ERROR
  if (level >= 40) return 13 // WARN
  if (level >= 30) return 9 // INFO
  if (level >= 20) return 5 // DEBUG
  return 1 // TRACE
}

// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitytext
const pinoLevelToSeverityText = (level: number) => {
  if (level >= 60) return 'FATAL'
  if (level >= 50) return 'ERROR'
  if (level >= 40) return 'WARN'
  if (level >= 30) return 'INFO'
  if (level >= 20) return 'DEBUG'
  return 'TRACE'
}

const isAttributeValue = (v: unknown): v is AttributeValue =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

const otelLogger = logs.getLogger('pino')

const otelStream = {
  write(line: string) {
    try {
      const { level, msg, time, ...rest } = JSON.parse(line) as {
        level: number
        msg: string
        time: number
      } & Record<string, unknown>
      const attributes: Attributes = Object.fromEntries(
        Object.entries(rest).filter(
          (entry): entry is [string, AttributeValue] =>
            entry[0] !== 'pid' && entry[0] !== 'hostname' && isAttributeValue(entry[1]),
        ),
      )
      const spanContext = trace.getActiveSpan()?.spanContext()
      otelLogger.emit({
        timestamp: time,
        severityNumber: pinoLevelToSeverityNumber(level),
        severityText: pinoLevelToSeverityText(level),
        body: msg,
        attributes,
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
