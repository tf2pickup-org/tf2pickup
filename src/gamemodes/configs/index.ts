import { _6v6 } from './6v6'
import { _9v9 } from './9v9'
import { ultiduo } from './ultiduo'
import type { GamemodeConfig } from '../types/gamemode-config'
import { environment } from '../../environment'

export const gamemodeConfigs: Record<typeof environment.QUEUE_CONFIG, GamemodeConfig> = {
  '6v6': _6v6,
  '9v9': _9v9,
  ultiduo,
}
