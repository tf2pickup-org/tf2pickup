import { register } from './register'
import { schedule } from './schedule'
import { cancelAll } from './cancel-all'
import { cancel } from './cancel'

export const tasks = {
  cancelAll,
  cancel,
  register,
  schedule,
} as const
