import type { GameNumber } from '../database/models/game.model'
import { errors } from '../errors'
import { logger } from '../logger'
import { servemeTf } from '../serveme-tf'
import { staticGameServers } from '../static-game-servers'
import { tf2QuickServer } from '../tf2-quick-server'
import type { SteamId64 } from '../shared/types/steam-id-64'

interface SelectGameServer {
  selected: string
  actor: SteamId64
}

export async function assignGameServer(gameNumber: GameNumber, select?: SelectGameServer) {
  if (select) {
    await assignSelected(gameNumber, select)
  } else {
    await assignFirstFree(gameNumber)
  }
}

async function assignFirstFree(gameNumber: GameNumber) {
  try {
    await staticGameServers.assign(gameNumber)
    return
  } catch (error) {
    logger.info({ error }, 'assignGameServer()')
  }

  try {
    await servemeTf.assign(gameNumber)
    return
  } catch (error) {
    logger.info({ error }, 'assignGameServer()')
  }

  try {
    await tf2QuickServer.assign(gameNumber)
    return
  } catch (error) {
    logger.info({ error }, 'assignGameServer()')
  }

  throw errors.internalServerError('no servers available')
}

function assignSelected(gameNumber: GameNumber, { selected, actor }: SelectGameServer) {
  if (selected.startsWith('static:')) {
    const id = selected.substring(7)
    return staticGameServers.assign(gameNumber, id, actor)
  }

  if (selected.startsWith('servemeTf:')) {
    const name = selected.substring(10)
    return servemeTf.assign(gameNumber, name, actor)
  }

  if (selected.startsWith('tf2QuickServer:')) {
    const payload = selected.substring(15)
    if (payload.startsWith('new:')) {
      const region = payload.substring(4)
      return tf2QuickServer.assign(gameNumber, { region }, actor)
    }
    return tf2QuickServer.assign(gameNumber, { serverId: payload }, actor)
  }

  throw errors.badRequest(`unknown game server selection: ${selected}`)
}
