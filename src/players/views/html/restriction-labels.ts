import type { RestrictionKind } from '../../restrictions/restriction-kind'

export const restrictionLabels = {
  ban: {
    path: 'bans',
    idPrefix: 'ban',
    verb: 'Ban',
    noun: 'ban',
    plural: 'bans',
    shortNoun: 'ban',
  },
  chatMute: {
    path: 'chat-mutes',
    idPrefix: 'chat-mute',
    verb: 'Mute',
    noun: 'chat mute',
    plural: 'chat mutes',
    shortNoun: 'mute',
  },
} as const satisfies Record<RestrictionKind, Record<string, string>>
