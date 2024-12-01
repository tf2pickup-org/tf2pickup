import { z } from 'zod'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { gameNumber } from '../games/schemas/game-number'

export const tasksSchema = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('onlinePlayers:validatePlayer'),
    args: z.object({
      player: steamId64,
    }),
  }),
  z.object({
    name: z.literal('games:autoSubstitutePlayer'),
    args: z.object({
      gameNumber: gameNumber,
      player: steamId64,
    }),
  }),
  z.object({
    name: z.literal('games.freePlayer'),
    args: z.object({
      player: steamId64,
    }),
  }),
  z.object({
    name: z.literal('mumble.cleanupChannel'),
    args: z.object({
      gameNumber,
    }),
  }),
  z.object({
    name: z.literal('queue:readyUpTimeout'),
    args: z.object({}),
  }),
  z.object({
    name: z.literal('queue:unready'),
    args: z.object({}),
  }),
  z.object({
    name: z.literal('staticGameServers:free'),
    args: z.object({ id: z.string() }),
  }),
  z.object({
    name: z.literal('servemeTf:endReservation'),
    args: z.object({ id: z.number() }),
  }),
])

type TasksT = z.infer<typeof tasksSchema>

export type TaskArgs = {
  [name in TasksT['name']]: Extract<TasksT, { name: name }>['args']
}

export type Tasks = {
  [name in TasksT['name']]: (args: TaskArgs[name]) => void | Promise<void>
}

export const tasks: Partial<Tasks> = {}
