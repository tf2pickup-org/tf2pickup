import type { PickDeep } from 'type-fest'
import type { PlayerModel } from '../../database/models/player.model'

export interface User {
  player: PickDeep<
    PlayerModel,
    | 'steamId'
    | 'roles'
    | 'avatar.medium'
    | 'name'
    | 'preferences.soundVolume'
    | 'hasAcceptedRules'
    | 'activeGame'
    | 'twitchTvProfile'
  >
}
