import type { Tf2ClassName } from './tf2-class-name'
import type { Tf2Team } from './tf2-team'

export type GameSlotId = `${Tf2Team}-${Tf2ClassName}-${number}`
