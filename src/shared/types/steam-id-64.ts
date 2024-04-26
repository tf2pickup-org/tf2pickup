declare const _steamId64: unique symbol
export type SteamId64 = string & { [_steamId64]: never }
