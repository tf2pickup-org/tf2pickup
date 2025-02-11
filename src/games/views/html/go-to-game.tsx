import type { GameNumber } from '../../../database/models/game.model'
import { bundle } from '../../../html/bundle'
import { mainTsPath } from '../../../html/main-ts-path'

export async function GoToGame(number: GameNumber) {
  const mainJs = await bundle(mainTsPath)
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <script type="module" remove-me="1s">{`
      import { goTo } from '${mainJs}';

      const path = '/games/${number}';
      goTo(path);
    `}</script>
    </div>
  )
}
