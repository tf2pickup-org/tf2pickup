import { NodeSDK } from '@opentelemetry/sdk-node'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { env } from 'process'
import { version } from './version'
import FastifyOtel from '@fastify/otel'
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node'
import { metrics } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici'

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: env['OTEL_SERVICE_NAME'] ?? 'tf2pickup.org',
    [ATTR_SERVICE_VERSION]: version,
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  instrumentations: [
    new RuntimeNodeInstrumentation(),
    new HttpInstrumentation(),
    new FastifyOtel({
      registerOnInitialization: true,
      requestHook: (span, request) => {
        span.updateName(`${request.method} ${request.routeOptions.url}`)
      },
    }),
    new MongoDBInstrumentation(),
    new PinoInstrumentation({
      logKeys: {
        traceId: 'trace_id',
        spanId: 'span_id',
        traceFlags: 'trace_flags',
      },
    }),
    new UndiciInstrumentation(),
  ],
})

sdk.start()

process.on('beforeExit', async () => {
  await sdk.shutdown()
})

export const meter = metrics.getMeter('tf2pickup.server', version)
