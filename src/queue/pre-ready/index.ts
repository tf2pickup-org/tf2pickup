import { cancel } from './cancel'
import { isPreReadied } from './is-pre-readied'
import { start } from './start'
import { toggle } from './toggle'

export const preReady = {
  cancel,
  isPreReadied,
  start,
  toggle,
} as const
