import { isEqual } from 'es-toolkit'
import { PlayerRole } from '../../database/models/player.model'
import type { GameModel } from '../../database/models/game.model'
import type { GameSlotModel } from '../../database/models/game-slot.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { Gateway } from '../../websocket/gateway'
import { players } from '../../players'
import { AdminToolbox } from '../views/html/admin-toolbox'
import { ConnectInfo } from '../views/html/connect-info'
import { DemoLink } from '../views/html/demo-link'
import { GameEventList } from '../views/html/game-event-list'
import { GameScore } from '../views/html/game-score'
import { GameSlot } from '../views/html/game-slot'
import { GameStateIndicator } from '../views/html/game-state-indicator'
import { LogsLink } from '../views/html/logs-link'
import { PlayerConnectionStatusIndicator } from '../views/html/player-connection-status-indicator'
import { gamePageUrl } from './game-page-url'

// Brings the clients on a game's page up to date with a change to the game. Each part is keyed, so
// a slow render of an older version can't land after a newer one.
export function sync(gateway: Gateway, before: GameModel, after: GameModel) {
  const page = gateway.to({ url: gamePageUrl(after.number) })
  const connectInfoFor = new Set<SteamId64>()
  let connectInfo = false
  let adminToolbox = false

  if (before.state !== after.state) {
    page.send(() => GameStateIndicator({ game: after }), { key: 'state' })
    connectInfo = true
    adminToolbox = true
  }

  if (!isEqual(before.gameServer, after.gameServer)) {
    adminToolbox = true
  }

  if (
    before.connectString !== after.connectString ||
    before.stvConnectString !== after.stvConnectString
  ) {
    connectInfo = true
  }

  for (const team of [Tf2Team.blu, Tf2Team.red]) {
    if (before.score?.[team] !== after.score?.[team]) {
      page.send(() => GameScore({ game: after, team }), { key: `score-${team}` })
    }
  }

  if (before.logsUrl !== after.logsUrl) {
    page.send(() => LogsLink({ game: after }), { key: 'logs' })
  }

  if (before.demoUrl !== after.demoUrl) {
    page.send(() => DemoLink({ game: after }), { key: 'demo' })
  }

  const newEvents = after.events.slice(before.events.length)
  if (newEvents.length > 0) {
    page.send(() =>
      Promise.all(newEvents.map(async event => await GameEventList.append({ game: after, event }))),
    )
  }

  for (const slot of after.slots) {
    const beforeSlot = before.slots.find(({ id }) => id === slot.id)
    if (before.state !== after.state || slotChanged(beforeSlot, slot)) {
      page.send(actor => GameSlot({ game: after, slot, actor }), { key: `slot-${slot.id}` })
    } else if (beforeSlot?.connectionStatus !== slot.connectionStatus) {
      page.send(() => PlayerConnectionStatusIndicator({ game: after, slot }), {
        key: `slot-${slot.id}-connection`,
      })
    }

    if (
      beforeSlot?.player !== slot.player ||
      beforeSlot.connectionStatus !== slot.connectionStatus ||
      beforeSlot.shouldJoinBy?.getTime() !== slot.shouldJoinBy?.getTime() ||
      beforeSlot.voiceServerUrl !== slot.voiceServerUrl
    ) {
      connectInfoFor.add(slot.player)
      if (beforeSlot) {
        connectInfoFor.add(beforeSlot.player)
      }
    }
  }

  const renderConnectInfo = (actor: SteamId64 | undefined) => ConnectInfo({ game: after, actor })
  if (connectInfo) {
    page.send(renderConnectInfo, { key: 'connect-info' })
  } else if (connectInfoFor.size > 0) {
    page.to({ players: [...connectInfoFor] }).send(renderConnectInfo, { key: 'connect-info' })
  }

  if (adminToolbox) {
    page.send(
      async actor =>
        actor && (await players.bySteamId(actor, ['roles'])).roles.includes(PlayerRole.admin)
          ? [
              await AdminToolbox.rconConnect({ game: after }),
              await AdminToolbox.gameControlButtons({ game: after }),
            ]
          : undefined,
      { key: 'admin-toolbox' },
    )
  }
}

function slotChanged(before: GameSlotModel | undefined, after: GameSlotModel) {
  return before?.player !== after.player || before.status !== after.status
}
