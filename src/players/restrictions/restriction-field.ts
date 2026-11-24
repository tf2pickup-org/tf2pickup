import type { RestrictionKind } from './restriction-kind'

export const restrictionField = {
  ban: 'bans',
  chatMute: 'chatMutes',
} as const satisfies Record<RestrictionKind, 'bans' | 'chatMutes'>
