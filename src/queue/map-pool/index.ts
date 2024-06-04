import { get } from './get'
import { reset } from './reset'
import { set } from './set'

export const mapPool = {
  get,
  reset,
  set,
} as const
