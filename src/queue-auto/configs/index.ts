import { _6v6 } from './6v6'
import { _9v9 } from './9v9'
import { bball } from './bball'
import { ultiduo } from './ultiduo'
import type { QueueConfig } from '../../queue/types/queue-config'
import { Gamemode } from '../../shared/types/gamemode'

export const queueConfigs: Record<Gamemode, QueueConfig> = {
  [Gamemode.sixes]: _6v6,
  [Gamemode.highlander]: _9v9,
  [Gamemode.ultiduo]: ultiduo,
  [Gamemode.bball]: bball,
}

export function getQueueConfig(gamemode: Gamemode): QueueConfig {
  return queueConfigs[gamemode]
}
