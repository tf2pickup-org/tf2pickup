import { get } from './get'
import { getDefault } from './get-default'
import { reset } from './reset'
import { set } from './set'

export const configuration = { get, getDefault, reset, set } as const
