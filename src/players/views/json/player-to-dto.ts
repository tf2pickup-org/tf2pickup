import type { PlayerModel } from '../../../database/models/player.model'

export function playerToDto(player: PlayerModel) {
  return {
    steamId: player.steamId,
    name: player.name,
    joinedAt: player.joinedAt.toISOString(),
    avatar: player.avatar,
    roles: player.roles,
    stats: player.stats,
    etf2lProfileId: player.etf2lProfile?.id ?? null,
    twitchTvProfileUrl: player.twitchTvProfile
      ? `https://www.twitch.tv/${player.twitchTvProfile.login}`
      : null,
    activeGame: player.activeGame ?? null,
    _links: {
      self: { href: `/api/v1/players/${player.steamId}` },
      games: { href: `/api/v1/players/${player.steamId}/games` },
    },
  }
}
