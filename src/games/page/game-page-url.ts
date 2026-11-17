import type { GameNumber } from '../../database/models/game.model'

export function gamePageUrl(number: GameNumber) {
  return `/games/${number}`
}
