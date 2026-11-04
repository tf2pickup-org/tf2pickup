import { ValueType } from '@opentelemetry/api'
import { meter } from '../otel'

export const verificationCount = meter.createCounter('tf2pickup.mumble.verification.count', {
  description: 'Mumble certificate binding attempts, by method and outcome',
  unit: '1',
  valueType: ValueType.INT,
})
