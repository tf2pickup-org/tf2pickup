import { Mutex } from 'async-mutex'
import { GameServerProvider, type GameModel, type GameServer } from '../database/models/game.model'
import { findFree } from './find-free'
import { update } from './update'
import { findOne } from './find-one'

const mutex = new Mutex()

export async function assign(game: GameModel, id?: string): Promise<GameServer> {
  return await mutex.runExclusive(async () => {
    const before = id ? await findOne(id) : await findFree()
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
