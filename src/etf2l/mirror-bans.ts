import { secondsToMilliseconds } from 'date-fns'
import { activityLog } from '../activity-log'
import { configuration } from '../configuration'
import type { PlayerBan } from '../database/models/player.model'
import { events } from '../events'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { shouldMirrorBan } from './should-mirror-ban'
import type { Etf2lProfile } from './types/etf2l-profile'

export async function mirrorBans(steamId: SteamId64, etf2lBans: NonNullable<Etf2lProfile['bans']>) {
  if (!(await configuration.get('players.etf2l_ban_sync'))) {
    return
  }

  const reasons = await configuration.get('players.etf2l_ban_sync_reasons')
  const { bans } = await players.bySteamId(steamId, ['bans'])
  const now = new Date()

  for (const etf2lBan of etf2lBans) {
    const start = new Date(secondsToMilliseconds(etf2lBan.start))
    const end = new Date(secondsToMilliseconds(etf2lBan.end))
    const reason = `ETF2L.org: ${etf2lBan.reason}`
    const isThisBan = (b: PlayerBan) =>
      b.source === 'etf2l' && b.start.getTime() === start.getTime()
    const local = bans?.find(isThisBan)

    if (!local) {
      if (end > now && shouldMirrorBan(etf2lBan.reason, reasons)) {
        await players.addBan({ player: steamId, admin: 'bot', start, end, reason, source: 'etf2l' })
      }
      continue
    }

    if (
      local.revokedLocally ||
      (local.end.getTime() === end.getTime() && local.reason === reason)
    ) {
      continue
    }

    let wasActive = false as boolean
    const after = await players.update(
      steamId,
      before => {
        const current = before.bans?.find(isThisBan)
        wasActive = !current?.revokedLocally && (current?.end ?? now) > now
        return { $set: { 'bans.$[ban].end': end, 'bans.$[ban].reason': reason } }
      },
      {
        arrayFilters: [
          {
            'ban.start': { $eq: start },
            'ban.source': 'etf2l',
            'ban.revokedLocally': { $ne: true },
          },
        ],
      },
    )

    const ban = after.bans?.find(isThisBan)
    if (wasActive && ban && !ban.revokedLocally && end <= now) {
      events.emit('player/ban:revoked', { player: steamId, ban, admin: 'bot' })
      await activityLog.record({ type: 'ban revoked', player: steamId, actor: 'bot', reason })
    }
  }
}
