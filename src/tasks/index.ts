import fp from 'fastify-plugin'
import { register } from './register'
import { schedule } from './schedule'
import { cancelAll } from './cancel-all'
import { schedulePending } from './schedule-pending'
import { cancel } from './cancel'

export const tasks = {
  cancelAll,
  cancel,
  register,
  schedule,
} as const

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', schedulePending)
  },
  { name: 'tasks' },
)
