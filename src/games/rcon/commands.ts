export function addGamePlayer<
  SteamId extends string,
  Name extends string,
  Team extends string,
  GameClass extends string,
>(
  steamId: SteamId,
  name: Name,
  team: Team,
  gameClass: GameClass,
): `sm_game_player_add ${SteamId} -name "${Name}" -team ${Team} -class ${GameClass}` {
  return `sm_game_player_add ${steamId} -name "${name}" -team ${team} -class ${gameClass}`
}

export function changelevel<Map extends string>(map: Map): `changelevel ${Map}` {
  return `changelevel ${map}`
}

export function delAllGamePlayers(): 'sm_game_player_delall' {
  return 'sm_game_player_delall'
}

export function delGamePlayer<SteamId extends string>(
  steamId: SteamId,
): `sm_game_player_del ${SteamId}` {
  return `sm_game_player_del ${steamId}`
}

export function enablePlayerWhitelist(): 'sm_game_player_whitelist 1' {
  return 'sm_game_player_whitelist 1'
}

export function disablePlayerWhitelist(): 'sm_game_player_whitelist 0' {
  return 'sm_game_player_whitelist 0'
}

export function execConfig<Config extends string>(config: Config): `exec ${Config}` {
  return `exec ${config}`
}

export function kickAll(): 'kickall' {
  return 'kickall'
}

export function svLogsecret(logSecret = '0'): `sv_logsecret ${string}` {
  return `sv_logsecret ${logSecret}`
}

export function logAddressAdd<Address extends string>(
  logAddress: Address,
): `logaddress_add ${Address}` {
  return `logaddress_add ${logAddress}`
}

export function logAddressDel<Address extends string>(
  logAddress: Address,
): `logaddress_del ${Address}` {
  return `logaddress_del ${logAddress}`
}

export function logsTfTitle<Title extends string>(logsTfTitle: Title): `logstf_title ${Title}` {
  return `logstf_title ${logsTfTitle}`
}

export function logsTfAutoupload<Upload extends 0 | 1 | 2>(
  upload: Upload,
): `logstf_autoupload ${Upload}` {
  // Set to 2 to upload logs from all matches. (default)
  // Set to 1 to upload logs from matches with at least 4 players.
  // Set to 0 to disable automatic upload. Admins can still upload logs by typing !ul
  return `logstf_autoupload ${upload}`
}

export function setPassword<Password extends string>(
  password: Password,
): `sv_password ${Password}` {
  return `sv_password ${password}`
}

export function tftrueWhitelistId<WhitelistId extends string>(
  whitelistId: WhitelistId,
): `tftrue_whitelist_id ${WhitelistId}` {
  return `tftrue_whitelist_id ${whitelistId}`
}

export function tvPort(port?: string) {
  return `tv_port ${port ?? ''}`
}

export function tvPassword(password?: string): `tv_password ${string}` {
  return `tv_password ${password ?? ''}`
}

export function say<Message extends string>(message: Message): `say ${Message}` {
  return `say ${message}`
}
