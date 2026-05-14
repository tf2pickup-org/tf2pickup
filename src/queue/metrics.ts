import { meter } from '../otel'

export const queueOperationDuration = meter.createHistogram(
  'tf2pickup.queue.operation.duration',
  {
    description: 'Time from WS message received to domain event emitted',
    unit: 's',
  },
)

export const queueMutexWaitDuration = meter.createHistogram(
  'tf2pickup.queue.mutex.wait.duration',
  {
    description: 'Time waiting to acquire the queue mutex',
    unit: 's',
  },
)
