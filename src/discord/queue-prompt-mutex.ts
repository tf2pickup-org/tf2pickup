import { Mutex } from 'async-mutex'

export const queuePromptMutex = new Mutex()
