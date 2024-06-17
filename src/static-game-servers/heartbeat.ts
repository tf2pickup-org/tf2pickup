import { nanoid } from 'nanoid'
import { collections } from '../database/collections'
import { events } from '../events'

interface HeartbeatProps {
  name: string
  address: string
  port: string
  rconPassword: string
  priority: number
  internalIpAddress: string
}

export async function heartbeat({
  name,
  address,
  port,
  rconPassword,
  priority,
  internalIpAddress,
}: HeartbeatProps) {
  const oldGameServer = await collections.staticGameServers.findOne({
    address,
    port,
  })
  const newGameServer = await collections.staticGameServers.findOneAndUpdate(
    {
      address,
      port,
    },
    {
      $set: {
        name,
        rconPassword,
        internalIpAddress,
        priority,
        isOnline: true,
        lastHeartbeatAt: new Date(),
      },
      $setOnInsert: {
        id: nanoid(),
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  )

  if (newGameServer === null) {
    throw new Error('Failed to update game server')
  }

  if (oldGameServer === null) {
    events.emit('staticGameServer:added', { gameServer: newGameServer })
  } else {
    events.emit('staticGameServer:updated', {
      before: oldGameServer,
      after: newGameServer,
    })
  }

  return newGameServer
}
