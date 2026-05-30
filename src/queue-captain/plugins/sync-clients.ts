import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import type { PlayerModel } from '../../database/models/player.model'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import type { AppWebSocket } from '../../websocket/types'
import { CaptainClassColumn } from '../views/html/captain-player-slot'
import { CaptainPlayerCount } from '../views/html/captain-player-count'
import { CaptainQueueSection } from '../views/html/captain-queue-section'
import { DraftBoard } from '../views/html/draft-board'
import { WantsCaptainToggle } from '../views/html/wants-captain-toggle'
import { queueConfigs } from '../../queue-auto/configs'
import { environment } from '../../environment'
import { BanAlerts } from '../../queue-auto/views/html/ban-alerts'
import { RunningGameSnackbar } from '../../queue-auto/views/html/running-game-snackbar'
import { SubstitutionRequests } from '../../queue-auto/views/html/substitution-requests'
import { StreamList } from '../../queue-auto/views/html/stream-list'
import { ChatMessages } from '../../queue-auto/views/html/chat'
import { OnlinePlayerCount } from '../../queue-auto/views/html/online-player-count'
import { OnlinePlayerList } from '../../queue-auto/views/html/online-player-list'
import { ReadyUpDialog } from '../../queue-auto/views/html/ready-up-dialog'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export default fp(
  async app => {
    let isActive = (await configuration.get('queue.mode')) === 'captain'

    events.on('queue/mode:changed', ({ mode }) => {
      isActive = mode === 'captain'
    })

    const config = queueConfigs[environment.QUEUE_CONFIG]

    async function syncQueuePage(socket: AppWebSocket) {
      if (!isActive) return
      const allPlayers = await collections.queuePlayers.find({}).toArray()
      const actor = socket.player?.steamId

      for (const cls of config.classes) {
        socket.send(await CaptainClassColumn({ gameClass: cls.name, players: allPlayers, actor }))
      }
      socket.send(await CaptainPlayerCount())
      socket.send(await WantsCaptainToggle({ actor }))
      socket.send(await OnlinePlayerCount())
      socket.send(await OnlinePlayerList())
      socket.send(await StreamList())

      if (socket.player) {
        const player = await collections.players.findOne<Pick<PlayerModel, 'activeGame'>>(
          { steamId: socket.player.steamId },
          { projection: { activeGame: 1 } },
        )
        socket.send(await ChatMessages())
        socket.send(await RunningGameSnackbar({ gameNumber: player?.activeGame }))
        socket.send(await BanAlerts({ actor: socket.player.steamId }))
        socket.send(await SubstitutionRequests())
      }
    }

    app.gateway.on('ready', async socket => {
      if (socket.currentUrl !== '/') return
      await syncQueuePage(socket)
    })

    app.gateway.on('navigated', async (socket, url) => {
      if (url !== '/') return
      await syncQueuePage(socket)
    })

    async function broadcastClassColumns() {
      if (!isActive) return
      const allPlayers = await collections.queuePlayers.find({}).toArray()
      const count = await CaptainPlayerCount()

      app.gateway.broadcast(async actor => {
        const columns = await Promise.all(
          config.classes.map(cls =>
            CaptainClassColumn({ gameClass: cls.name, players: allPlayers, actor }),
          ),
        )
        return [...columns, count]
      })

      app.gateway.broadcast(actor => WantsCaptainToggle({ actor }))
    }

    events.on('queue/players:updated', safe(broadcastClassColumns))

    events.on(
      'queue/state:updated',
      safe(async ({ state }) => {
        if (!isActive) return

        if (state === QueueState.ready) {
          const unreadyPlayers = (
            await collections.queuePlayers.find({ ready: false }).toArray()
          ).map(p => p.steamId)
          app.gateway.to({ players: unreadyPlayers }).send(actor => ReadyUpDialog.show(actor!))
        }

        if (state === QueueState.draft) {
          app.gateway
            .to({ url: '/' })
            .send(async actor => [await DraftBoard({ actor }), '<form id="captain-queue"></form>'])
        }

        if (state === QueueState.waiting) {
          app.gateway
            .to({ url: '/' })
            .send(async actor => ['<div id="draft-board" />', await CaptainQueueSection({ actor })])
        }
      }),
    )

    events.on(
      'queue/captain:selected',
      // eslint-disable-next-line @typescript-eslint/require-await
      safe(async () => {
        if (!isActive) return
        app.gateway.to({ url: '/' }).send(actor => DraftBoard({ actor }))
      }),
    )

    events.on(
      'queue/draft:pickMade',
      // eslint-disable-next-line @typescript-eslint/require-await
      safe(async () => {
        if (!isActive) return
        app.gateway.to({ url: '/' }).send(actor => DraftBoard({ actor }))
      }),
    )

    events.on(
      'queue/draft:mapBanMade',
      // eslint-disable-next-line @typescript-eslint/require-await
      safe(async () => {
        if (!isActive) return
        app.gateway.to({ url: '/' }).send(actor => DraftBoard({ actor }))
      }),
    )

    events.on(
      'queue/draft:completed',
      // eslint-disable-next-line @typescript-eslint/require-await
      safe(async () => {
        if (!isActive) return
        app.gateway.to({ url: '/' }).send(actor => DraftBoard({ actor }))
      }),
    )

    events.on('queue:playerKicked', ({ player }) => {
      if (!isActive) return
      app.gateway.to({ player }).send(() => undefined)
    })

    events.on(
      'player:connected',
      safe(async () => {
        if (!isActive) return
        const opl = await OnlinePlayerList()
        const opc = await OnlinePlayerCount()
        app.gateway.to({ url: '/' }).send(() => [opl, opc])
      }),
    )

    events.on(
      'player:disconnected',
      safe(async () => {
        if (!isActive) return
        const opl = await OnlinePlayerList()
        const opc = await OnlinePlayerCount()
        app.gateway.to({ url: '/' }).send(() => [opl, opc])
      }),
    )

    events.on(
      'player/activeGame:updated',
      safe(async ({ steamId, activeGame }) => {
        if (!isActive) return
        const cmp = await RunningGameSnackbar({ gameNumber: activeGame })
        app.gateway
          .to({ player: steamId })
          .to({ url: '/' })
          .send(() => cmp)
      }),
    )

    events.on(
      'game:substituteRequested',
      safe(async ({ game, replacee }) => {
        if (!isActive) return
        const cmp = await SubstitutionRequests()
        app.gateway.to({ url: '/' }).send(() => cmp)
        app.gateway.broadcast((actor: SteamId64 | undefined) =>
          SubstitutionRequests.notify({ game, replacee, actor }),
        )
      }),
    )

    events.on(
      'game:playerReplaced',
      safe(async () => {
        if (!isActive) return
        const cmp = await SubstitutionRequests()
        app.gateway.to({ url: '/' }).send(() => cmp)
      }),
    )

    events.on(
      'game:ended',
      safe(async () => {
        if (!isActive) return
        const cmp = await SubstitutionRequests()
        app.gateway.to({ url: '/' }).send(() => cmp)
      }),
    )

    events.on(
      'twitch.tv/streams:updated',
      safe(async () => {
        if (!isActive) return
        const cmp = await StreamList()
        app.gateway.to({ url: '/' }).send(() => cmp)
      }),
    )

    events.on(
      'player/ban:added',
      safe(async ({ player }) => {
        if (!isActive) return
        const cmp = await BanAlerts({ actor: player })
        app.gateway.to({ players: [player] }).send(() => cmp)
      }),
    )

    events.on(
      'player/ban:revoked',
      safe(async ({ player }) => {
        if (!isActive) return
        const cmp = await BanAlerts({ actor: player })
        app.gateway.to({ players: [player] }).send(() => cmp)
      }),
    )

    events.on('chat:messageSent', ({ message, previousMessage }) => {
      if (!isActive) return
      app.gateway
        .to({ authenticated: true })
        .to({ url: '/' })
        .send(() => ChatMessages.append({ message, previousMessageAt: previousMessage?.at }))
    })

    events.on('chat:messageDeleted', ({ messageId }) => {
      if (!isActive) return
      app.gateway
        .to({ authenticated: true })
        .to({ url: '/' })
        .send(() => ChatMessages.remove(messageId))
    })
  },
  { name: 'captain sync clients' },
)
