import { meter } from '../../otel'

export const captainDraftMetrics = {
  poolSize: meter.createHistogram('tf2pickup.captains.draft.pool_size', {
    description: 'Players in a captain draft pool when it starts',
    unit: '{players}',
  }),
  decisions: meter.createCounter('tf2pickup.captains.draft.decision.count', {
    description: 'Captain draft decisions (picks and bans) by phase and how they were made',
    unit: '1',
  }),
} as const
