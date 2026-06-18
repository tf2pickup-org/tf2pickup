import pino from 'pino'
import princess from 'pino-princess'
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

const flattenAttributes = (obj: Record<string, unknown>, prefix = ''): Attributes => {
  const result: Attributes = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (isAttributeValue(value)) {
      result[fullKey] = value
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenAttributes(value as Record<string, unknown>, fullKey))
    }
  }
  return result
}

const otelLogger = logs.getLogger('pino')

const otelStream = {
  write(line: string) {
    try {
      const { level, msg, time, err, ...rest } = JSON.parse(line) as {
        level: number
        msg: string
        time: number
        err?: Record<string, unknown>
      } & Record<string, unknown>
      delete rest['pid']
      delete rest['hostname']
      const attributes = flattenAttributes(rest)
      if (err !== undefined) {
        if (isAttributeValue(err['type'])) attributes['exception.type'] = err['type']
        if (isAttributeValue(err['message'])) attributes['exception.message'] = err['message']
        if (isAttributeValue(err['stack'])) attributes['exception.stacktrace'] = err['stack']
      }
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
    : (princess() as pino.DestinationStream)

export const logger = pino({ level: environment.LOG_LEVEL }, stream)
