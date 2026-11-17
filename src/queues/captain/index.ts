import { reset } from './reset'
import { teardown } from './teardown'

export const captainEngine = { reset, teardown } as const
