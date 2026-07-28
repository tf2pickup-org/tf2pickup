import { getMode } from './get-mode'
import { getState } from './get-state'
import { setState } from './set-state'

// The parts of the queue both modes share. Anything specific to how teams are formed lives in
// queue-auto or queue-captains instead.
export const queue = { getMode, getState, setState } as const
