import { get } from './get'
import { reset } from './reset'
import { set } from './set'

export const configuration = { get, reset, set } as const
