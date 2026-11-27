import { collections } from '../../database/collections'
import { PlayerRole } from '../../database/models/player.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { AppWebSocket } from '../../websocket/types'
import { pageTag } from '../../websocket/page-tag'
import { players } from '../../players'
import { AdminToolbox } from '../views/html/admin-toolbox'
import { ConnectInfo } from '../views/html/connect-info'
import { DemoLink } from '../views/html/demo-link'
import { GameEventList } from '../views/html/game-event-list'
import { GameScore } from '../views/html/game-score'
import { GameSlot } from '../views/html/game-slot'
import { GameStateIndicator } from '../views/html/game-state-indicator'
import { LogsLink } from '../views/html/logs-link'
import { gamePageUrl } from './game-page-url'

// Brings a client that just opened a game page up to date, covering whatever changed while its
// socket was down: sync only sends changes, so those would otherwise be lost.
export async function render(socket: AppWebSocket) {
  const tag = pageTag(socket)
  const number = gamePageUrl.parse(socket.currentUrl)
  if (number === undefined) {
    return
  }

  const game = await collections.games.findOne({ number })
  if (!game) {
    return
  }

  const actor = socket.player?.steamId
  const isAdmin =
    !!actor && (await players.bySteamId(actor, ['roles'])).roles.includes(PlayerRole.admin)

  const fragments = await Promise.all([
    GameStateIndicator({ game }),
    ...[Tf2Team.blu, Tf2Team.red].map(team => GameScore({ game, team })),
    LogsLink({ game }),
    DemoLink({ game }),
    ...game.slots.map(slot => GameSlot({ game, slot, actor })),
    ConnectInfo({ game, actor }),
    ...(isAdmin
      ? [AdminToolbox.rconConnect({ game }), AdminToolbox.gameControlButtons({ game })]
      : []),
    GameEventList.replace({ game }),
  ])
  for (const html of fragments) {
    socket.send(tag + html)
  }
}
