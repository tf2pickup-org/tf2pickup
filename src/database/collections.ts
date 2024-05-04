import { database } from './database'
import { QueueSlotModel } from './models/queue-slot.model'
import { QueueStateModel } from './models/queue-state.model'

export const collections = {
  queueSlots: database.collection<QueueSlotModel>('queue.slots'),
  queueState: database.collection<QueueStateModel>('queue.state'),
}
