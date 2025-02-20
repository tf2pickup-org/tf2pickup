import { errors } from '../errors'
import { tasks, type Tasks } from './tasks'

export function register<T extends keyof Tasks>(name: T, task: Tasks[T]) {
  if (name in tasks) {
    throw errors.conflict(`task already registered: ${name}`)
  }

  tasks[name] = task
}
