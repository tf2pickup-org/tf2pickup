import type { ObjectId } from 'mongodb'

export interface PlayerBanModel {
  player: ObjectId
  admin: ObjectId
  start: Date
  end: Date
  reason: string
}
