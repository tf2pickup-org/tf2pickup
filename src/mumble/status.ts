import { events } from '../events'

export const enum MumbleClientStatus {
  disconnected = 'disconnected',
  connecting = 'connecting',
  connected = 'connected',
  error = 'error',
}

let status: MumbleClientStatus = MumbleClientStatus.disconnected

export function setStatus(newStatus: MumbleClientStatus) {
  status = newStatus
  events.emit('mumble/connectionStatusChanged', { status })
}

export function getStatus() {
  return status
}
