import { Gamemode } from './types/gamemode'

const displayNames: Record<Gamemode, string> = {
  [Gamemode.sixes]: '6v6',
  [Gamemode.highlander]: '9v9',
  [Gamemode.bball]: 'BBall',
  [Gamemode.ultiduo]: 'Ultiduo',
  [Gamemode.test]: 'test',
}

export function gamemodeDisplayName(gamemode: Gamemode): string {
  return displayNames[gamemode]
}
