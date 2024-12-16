import { Mutex } from 'async-mutex'
import { GameServerProvider, type GameModel, type GameServer } from '../database/models/game.model'
import { findFree } from './find-free'
import { update } from './update'

const mutex = new Mutex()

export async function assign(game: GameModel): Promise<GameServer> {
  return await mutex.runExclusive(async () => {
    const before = await findFree()
    if (!before) {
      throw new Error(`no free servers available for game ${game.number}`)
    }

    const server = await update(
      {
        id: before.id,
      },
      {
        $set: {
          game: game.number,
        },
      },
    )

    return {
      provider: GameServerProvider.static,
      id: server.id,
      name: server.name,
      address: server.address,
      port: server.port,

      rcon: {
        address: server.internalIpAddress,
        port: server.port,
        password: server.rconPassword,
      },
    }
  })
}
