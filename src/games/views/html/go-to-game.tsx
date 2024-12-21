import { nanoid } from 'nanoid'
import type { GameNumber } from '../../../database/models/game.model'

export function GoToGame(number: GameNumber) {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <script type="module" id={id}>{`
        import htmx from '/js/htmx.js';
        import { reportNavigation } from '/js/navigation.js';
        const path = '/games/${number}';
        htmx.ajax('get', path).then(() => {
          history.pushState({}, '', path);
          reportNavigation(path);
        });
        document.getElementById('${id}').remove();
      `}</script>
    </div>
  )
}
