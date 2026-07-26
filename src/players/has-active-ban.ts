import type { PlayerModel } from '../database/models/player.model'

export function hasActiveBan(player: Pick<PlayerModel, 'bans'>): boolean {
  return (player.bans ?? []).some(ban => ban.end > new Date())
}
