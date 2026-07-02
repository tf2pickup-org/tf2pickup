import fp from 'fastify-plugin'
import { ValueType } from '@opentelemetry/api'
import { meter } from '../../otel'
import type { AppWebSocket } from '../../websocket/types'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { QueueState } from '../../database/models/queue-state.model'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.gateway.on('queue:audiostatus', (socket, audioReady) => {
      socket.audioReady = audioReady
    })

    const gauge = meter.createObservableGauge('tf2pickup.audio_blocked_players.count', {
      description: 'Number of connected players whose browser is blocking the ready-up sound',
      unit: '1',
      valueType: ValueType.INT,
    })
    gauge.addCallback(result => {
      const blocked = [...app.websocketServer.clients].filter(client => {
        const socket = client as AppWebSocket
        return !!socket.player && socket.audioReady === false
      }).length
      result.observe(blocked)
    })

    // Records each ready-up prompt as it is dispatched, split by whether the player's
    // browser could play the sound. Missed prompts are the ones tagged audioBlocked=true.
    const readyUpNotifications = meter.createCounter('tf2pickup.ready_up.notified.count', {
      description: 'Ready-up prompts delivered to players, split by whether the sound could play',
      unit: '1',
      valueType: ValueType.INT,
    })
    events.on(
      'queue/state:updated',
      safe(async ({ state }) => {
        if (state !== QueueState.ready) {
          return
        }

        const recipients = (
          await collections.queueSlots
            .find({ player: { $ne: null }, ready: { $eq: false } })
            .toArray()
        ).map(slot => slot.player!.steamId)
        const clients = [...app.websocketServer.clients].map(client => client as AppWebSocket)

        for (const steamId of recipients) {
          const sockets = clients.filter(client => client.player?.steamId === steamId)
          if (sockets.length === 0) {
            continue
          }
          const audioBlocked = sockets.every(socket => socket.audioReady === false)
          readyUpNotifications.add(1, { audioBlocked })
        }
      }),
    )
  },
  { name: 'track audio blocked players' },
)
