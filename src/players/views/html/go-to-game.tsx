import { nanoid } from 'nanoid'
import type { GameNumber } from '../../../database/models/game.model'
import { environment } from '../../../environment'

export function GoToGame(number: GameNumber) {
  const id = nanoid()
  return (
    <div id="notify-container" hx-swap-oob="beforeend">
      <script type="module" id={id}>{`
        import htmx from '/js/htmx.js';
        const path = '${environment.WEBSITE_URL}/games/${number}';
        htmx.ajax('get', path).then(() => {
          history.pushState({}, '', path);
        });
        document.getElementById('${id}').remove();
      `}</script>
    </div>
  )
}
