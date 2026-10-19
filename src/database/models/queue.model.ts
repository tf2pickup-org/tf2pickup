import { secondsToMilliseconds } from 'date-fns'
import type { ObjectId } from 'mongodb'
import { z } from 'zod'
import { Gamemode } from '../../shared/types/gamemode'
import type { MapPoolEntry } from './map-pool-entry.model'

declare const _queueId: unique symbol
export type QueueId = ObjectId & { [_queueId]: never }

// What admins can change on an existing queue.
export const queueConfigurationSchema = z.object({
  name: z.string().trim().min(1),
  skillThreshold: z.number().nullable().default(null),
  requireVerification: z.boolean().default(false),
  readyUpTimeout: z
    .number()
    .positive()
    .default(secondsToMilliseconds(40))
    .describe('Time players have to ready up before they are kicked out of the queue'),
  readyStateTimeout: z
    .number()
    .positive()
    .default(secondsToMilliseconds(60))
    .describe(
      'Time the queue stays in the ready-up state before going back to the waiting state, unless all players ready up',
    ),
  mapCooldown: z
    .number()
    .int()
    .nonnegative()
    .default(2)
    .describe('How many times the last played map cannot be an option to vote for'),
  // null inherits the gamemode's whitelist, then the global one
  whitelistId: z.string().trim().min(1).nullable().default(null),
})

export type QueueConfiguration = z.infer<typeof queueConfigurationSchema>

// What is fixed once the queue exists.
export const createQueueSchema = queueConfigurationSchema.extend({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  gamemode: z.enum(Gamemode),
  launchMode: z.literal('auto'),
})

export interface QueueModel extends z.infer<typeof createQueueSchema> {
  _id: QueueId
  position: number
  enabled: boolean
  maps: MapPoolEntry[]
}
