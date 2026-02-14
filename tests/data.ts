// list of test users
export const users = [
  { steamId: '76561199195756652', name: 'Promenader', roles: ['admin'] },
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
  { steamId: '76561199203544766', name: 'TommyGun' },
  // Additional users for 9v9 support
  { steamId: '76561199999000001', name: 'NeonBlitz' },
  { steamId: '76561199999000002', name: 'CrazyComet' },
  { steamId: '76561199999000003', name: 'FrostByte' },
  { steamId: '76561199999000004', name: 'IronViper' },
  { steamId: '76561199999000005', name: 'ShadowPulse' },
  // Extra users not in any game - available for substitute tests
  { steamId: '76561199999000006', name: 'GhostWalker' },
] as const
