import { meter } from '../otel'

export const queueWsCallDuration = meter.createHistogram('tf2pickup.queue.ws_call.duration', {
  description: 'Time from WS message received to domain event emitted',
  unit: 'ms',
})

export const queueMutexWaitDuration = meter.createHistogram('tf2pickup.queue.mutex_wait.duration', {
  description: 'Time waiting to acquire the queue mutex',
  unit: 'ms',
})
