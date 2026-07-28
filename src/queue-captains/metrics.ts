import { ValueType } from '@opentelemetry/api'
import { meter } from '../otel'

export const draftDuration = meter.createHistogram('tf2pickup.captains.draft.duration', {
  description: 'Time from a draft starting to its game being created',
  unit: 'ms',
})

export const draftTurns = meter.createCounter('tf2pickup.captains.draft.turn.count', {
  description: 'Draft turns, tagged by kind: chosen by the captain, forced, or timed out',
  unit: '{turns}',
  valueType: ValueType.INT,
})

export const draftPoolSize = meter.createHistogram('tf2pickup.captains.draft.pool_size', {
  description: 'How many players were in the pool when a draft started',
  unit: '{players}',
  valueType: ValueType.INT,
})
