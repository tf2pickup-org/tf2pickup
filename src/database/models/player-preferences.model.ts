import type { ObjectId } from 'mongodb'

// TODO remove, move to PlayerModel
export interface PlayerPreferencesModel {
  player: ObjectId
  preferences: {
    soundVolume?: string
  }
}
