import FastifyOtel from '@fastify/otel'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { version } from './version'
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),
  instrumentations: [
    new FastifyOtel({ registerOnInitialization: true }),
    new PinoInstrumentation({}),
  ],
  resource: defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_VERSION]: version,
    }),
  ),
})

sdk.start()

// gracefully shut down the SDK on process exit
process.on('beforeExit', async () => {
  await sdk.shutdown()
})
