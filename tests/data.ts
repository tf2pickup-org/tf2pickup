export interface User {
  steamId: string
  name: string
}

// list of test users
export const users = [
  { steamId: '76561199195756652', name: 'Promenader' },
  { steamId: '76561199195935001', name: 'Mayflower' },
  { steamId: '76561199195486701', name: 'Polemic' },
  { steamId: '76561199195468328', name: 'Shadowhunter' },
  { steamId: '76561199195972852', name: 'MoonMan' },
  { steamId: '76561199195926019', name: 'Underfire' },
  { steamId: '76561199195611071', name: 'Astropower' },
  { steamId: '76561199195733445', name: 'LlamaDrama' },
  { steamId: '76561199195601536', name: 'SlitherTuft' },
  { steamId: '76561199196157187', name: 'Blacklight' },
  { steamId: '76561199195855422', name: 'AstraGirl' },
  { steamId: '76561199195188363', name: 'BellBoy' },
] as const
