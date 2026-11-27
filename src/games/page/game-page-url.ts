import type { GameNumber } from '../../database/models/game.model'

export function gamePageUrl(number: GameNumber) {
  return `/games/${number}`
}

gamePageUrl.parse = (url: string | undefined): GameNumber | undefined => {
  const number = /^\/games\/(\d+)$/.exec(url ?? '')?.[1]
  return number === undefined ? undefined : (Number(number) as GameNumber)
}
