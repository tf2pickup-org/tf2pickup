import { meter } from '../../otel'

export const draftPoolSize = meter.createHistogram('tf2pickup.captains.draft.pool_size', {
  description: 'Players in a captain draft pool when it starts',
  unit: '{players}',
})

export const draftTurnCount = meter.createCounter('tf2pickup.captains.draft.turn.count', {
  description: 'Captain draft turns by phase and how they were decided',
  unit: '1',
})
