import { ValueType } from '@opentelemetry/api'
import { meter } from '../otel'
import { scheduledTaskTimers } from './scheduled-task-timers'

export const taskExecutionCount = meter.createCounter('tf2pickup.tasks.execution.count', {
  description: 'Scheduled tasks executed, by name and outcome',
  unit: '1',
  valueType: ValueType.INT,
})

export const taskExecutionDuration = meter.createHistogram('tf2pickup.tasks.execution.duration', {
  description: 'Time taken to execute a scheduled task handler',
  unit: 'ms',
})

const pendingTaskCount = meter.createObservableUpDownCounter('tf2pickup.tasks.pending.count', {
  description: 'Scheduled tasks with a pending timer',
  unit: '1',
  valueType: ValueType.INT,
})
pendingTaskCount.addCallback(result => {
  result.observe(scheduledTaskTimers.size)
})
