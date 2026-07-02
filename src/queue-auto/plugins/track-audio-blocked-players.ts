import fp from 'fastify-plugin'
import { ValueType } from '@opentelemetry/api'
import { meter } from '../../otel'
import type { AppWebSocket } from '../../websocket/types'

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
      const blocked = [...app.websocketServer.clients].filter(
        client => (client as AppWebSocket).audioReady === false,
      ).length
      result.observe(blocked)
    })
  },
  { name: 'track audio blocked players' },
)
