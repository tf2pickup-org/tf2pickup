import fp from 'fastify-plugin'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { assertIsError } from '../utils/assert-is-error'
import { logger } from '../logger'
import { collections } from '../database/collections'
import { differenceInMilliseconds } from 'date-fns'

interface Tasks {
  'onlinePlayers:validatePlayer': (steamId: SteamId64) => Promise<void>
  'queue:readyUpTimeout': () => Promise<void>
  'queue:unready': () => Promise<void>
}

const tasks: Partial<Tasks> = {}
const timers = new Map<keyof Tasks, ReturnType<typeof setTimeout>>()

export function registerTask<T extends keyof Tasks>(name: T, task: Tasks[T]) {
  if (name in tasks) {
    throw new Error(`task already registered: ${name}`)
  }

  tasks[name] = task
}

export async function scheduleTask<T extends keyof Tasks>(
  name: T,
  ms: number,
  ...args: Parameters<Tasks[T]>
) {
  if (!tasks[name]) {
    throw new Error(`task not registered: ${name}`)
  }

  const at = new Date(Date.now() + ms)
  await collections.tasks.insertOne({ name, at, params: args })

  const taskWrapped = executeTask(name, at, ...args)
  const timeout = setTimeout(async () => {
    await taskWrapped()
  }, ms)
  timers.set(name, timeout)
}

function executeTask<T extends keyof Tasks>(name: T, at: Date, ...args: Parameters<Tasks[T]>) {
  return async () => {
    logger.debug({ task: { name, args } }, `executing scheduled task`)
    if (!tasks[name]) {
      throw new Error(`task not registered: ${name}`)
    }
    try {
      // https://github.com/microsoft/TypeScript/issues/57322
      // task(...args)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      // eslint-disable-next-line prefer-spread
      await tasks[name]!.apply(null, args)
      await collections.tasks.deleteOne({ name, at })
    } catch (error) {
      assertIsError(error)
      logger.error(error)
    }
  }
}

async function schedulePendingTasks() {
  const pendingTasks = await collections.tasks.find().toArray()
  for (const task of pendingTasks) {
    const name = task.name as keyof Tasks
    const execute = executeTask(name, task.at, ...(task.params as Parameters<Tasks[keyof Tasks]>))

    const when = differenceInMilliseconds(task.at, Date.now())
    if (when < 0) {
      await execute()
    } else {
      const timeout = setTimeout(async () => {
        await execute()
      }, when)
      timers.set(name, timeout)
    }
  }
}

export async function cancelAllTasks<T extends keyof Tasks>(name: T) {
  const timer = timers.get(name)
  if (timer?.hasRef()) {
    clearTimeout(timer)
  }
  await collections.tasks.deleteMany({ name })
}

declare module 'fastify' {
  interface FastifyInstance {
    registerTask: typeof registerTask
    scheduleTask: typeof scheduleTask
    cancelAllTasks: typeof cancelAllTasks
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.decorate('registerTask', registerTask)
    app.decorate('scheduleTask', scheduleTask)
    app.decorate('cancelAllTasks', cancelAllTasks)

    app.addHook('onReady', schedulePendingTasks)
  },
  { name: 'tasks' },
)
