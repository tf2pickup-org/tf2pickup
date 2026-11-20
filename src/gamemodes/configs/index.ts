import { _6v6 } from './6v6'
import { _9v9 } from './9v9'
import { _4v4 } from './4v4'
import { bball } from './bball'
import { ultiduo } from './ultiduo'
import { ultitrio } from './ultitrio'
import type { GamemodeConfig } from '../types/gamemode-config'
import { Gamemode } from '../../shared/types/gamemode'

export const gamemodeConfigs: Record<Gamemode, GamemodeConfig> = {
  [Gamemode.sixes]: _6v6,
  [Gamemode.highlander]: _9v9,
  [Gamemode.ultiduo]: ultiduo,
  [Gamemode.bball]: bball,
  [Gamemode.fours]: _4v4,
  [Gamemode.ultitrio]: ultitrio,
}
