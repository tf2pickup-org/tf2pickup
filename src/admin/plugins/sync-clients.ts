import fp from 'fastify-plugin'
import { events } from '../../events'
import { MumbleClientStatus } from '../voice-server/views/html/mumble-client-status'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  events.on('mumble/connectionStatusChanged', () => {
    app.gateway.to({ url: '/admin/voice-server' }).send(() => MumbleClientStatus())
  })
})
