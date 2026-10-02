import { get } from './get'
import { set } from './set'

export const mapPool = {
  get,
  set,
} as const
