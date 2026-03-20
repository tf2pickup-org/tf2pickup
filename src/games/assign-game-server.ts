import { Mutex } from 'async-mutex'
import type { GameNumber } from '../database/models/game.model'
import { errors } from '../errors'
import { logger } from '../logger'
import { servemeTf } from '../serveme-tf'
import { staticGameServers } from '../static-game-servers'
import { tf2QuickServer } from '../tf2-quick-server'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { GameServerSelection } from './schemas/game-server-selection'
import { events } from '../events'

export interface SelectGameServer {
  selected: GameServerSelection
  actor: SteamId64
}

const mutex = new Mutex()

export async function assignGameServer(gameNumber: GameNumber, select?: SelectGameServer) {
  return mutex.runExclusive(async () => {
    if (select) {
      await assignSelected(gameNumber, select)
    } else {
      await assignFirstFree(gameNumber)
    }
    events.emit('game:gameServerAssigned', { gameNumber })
  })
}

async function assignFirstFree(gameNumber: GameNumber) {
  try {
    await staticGameServers.assign(gameNumber)
    return
  } catch (error) {
    logger.warn({ error }, 'static game server unavailable, trying next provider')
  }

  try {
    await servemeTf.assign(gameNumber)
    return
  } catch (error) {
    logger.warn({ error }, 'serveme.tf unavailable, trying next provider')
  }

  try {
    await tf2QuickServer.assign(gameNumber)
    return
  } catch (error) {
    logger.warn({ error }, 'tf2QuickServer unavailable, all providers exhausted')
  }

  throw errors.internalServerError('no servers available')
}

function assignSelected(gameNumber: GameNumber, { selected, actor }: SelectGameServer) {
  switch (selected.provider) {
    case 'static':
      return staticGameServers.assign(gameNumber, selected.id, actor)

    case 'servemeTf':
      return servemeTf.assign(gameNumber, selected.name, actor)

    case 'tf2QuickServer':
      if (selected.server.select === 'new') {
        return tf2QuickServer.assign(gameNumber, { region: selected.server.region }, actor)
      }
      return tf2QuickServer.assign(gameNumber, { serverId: selected.server.serverId }, actor)
  }
}
