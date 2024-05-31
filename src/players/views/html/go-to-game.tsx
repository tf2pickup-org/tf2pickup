import { nanoid } from 'nanoid'
import type { GameNumber } from '../../../database/models/game.model'
import { environment } from '../../../environment'

export function GoToGame(number: GameNumber) {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <div
        id={id}
        _={`on load go to url ${environment.WEBSITE_URL}/games/${number} then remove me`}
      ></div>
    </div>
  )
}
