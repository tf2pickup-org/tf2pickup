import type { SteamId64 } from '../../shared/types/steam-id-64'

export enum QueueState {
  // waiting for players to join the queue
  waiting = 'waiting',

  // players are expected to ready up
  ready = 'ready',

  // all players have readied up; the map vote dialog is open
  mapVote = 'mapVote',

  // everybody has readied up, the game is being launched
  launching = 'launching',
}

export interface QueueStateModel {
  state: QueueState
  last?: SteamId64
}
