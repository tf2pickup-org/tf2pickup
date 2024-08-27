import { get } from './get'
import { getDefault } from './get-default'
import { reset } from './reset'
import { set } from './set'
import { setMulti } from './set-multi'

export const configuration = { get, getDefault, reset, set, setMulti } as const
