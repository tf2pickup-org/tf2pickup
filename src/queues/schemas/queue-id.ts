import { ObjectId } from 'mongodb'
import { z } from 'zod'
import type { QueueId } from '../../database/models/queue.model'

export const queueId = z.instanceof(ObjectId).transform(id => id as QueueId)
