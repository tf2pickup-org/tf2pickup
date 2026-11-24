import { active } from './active'
import { activeFilter } from './active-filter'
import { add } from './add'
import { isActive } from './is-active'
import { revoke } from './revoke'

export const restrictions = { add, revoke, isActive, active, activeFilter } as const
