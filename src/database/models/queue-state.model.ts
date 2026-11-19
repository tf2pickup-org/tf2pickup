import type { QueueId } from './queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { ReadyPhase } from '../../queues/captain/types/ready-phase'

export enum QueueState {
  // waiting for players to join the queue
  waiting = 'waiting',

  // players are expected to ready up
  ready = 'ready',

  // everybody has readied up, the game is being launched
  launching = 'launching',

  // captain queues only: the captains are picking teams
  drafting = 'drafting',

  // captain queues only: the captains are banning maps
  banningMaps = 'banningMaps',
}

export interface QueueStateModel {
  queue: QueueId
  state: QueueState
  last?: SteamId64
  captainReady?: ReadyPhase
}
