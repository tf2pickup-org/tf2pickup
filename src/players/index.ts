import { addBan } from './add-ban'
import { addChatMute } from './add-chat-mute'
import { bySteamId } from './by-steam-id'
import { findByName } from './find-by-name'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { hasActiveChatMute } from './has-active-chat-mute'
import { revokeBan } from './revoke-ban'
import { revokeChatMute } from './revoke-chat-mute'
import { setSkill } from './set-skill'
import { setVerified } from './set-verified'
import { update } from './update'
import { upsert } from './upsert'

export const players = {
  addBan,
  addChatMute,
  bySteamId,
  findByName,
  getBanExpiryDate,
  hasActiveChatMute,
  revokeBan,
  revokeChatMute,
  setSkill,
  setVerified,
  update,
  upsert,
} as const
