declare const _steamId64: unique symbol
export type SteamId64 = string & { [_steamId64]: never }

// Sentinel value that replaces a deleted player's steam id across historical
// records (games, chat, activity log). It never collides with a real steam id
// (which is always 17 digits) and has no associated player document, so render
// sites treat it as a deleted user.
export const deletedUserSteamId = '[deleted]' as SteamId64

export function isDeletedUser(steamId: SteamId64): boolean {
  return steamId === deletedUserSteamId
}
