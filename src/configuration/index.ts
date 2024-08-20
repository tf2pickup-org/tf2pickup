import { get } from './get'
import { reset } from './reset'
import { set } from './set'
import { setMulti } from './set-multi'

export const configuration = { get, reset, set, setMulti } as const
