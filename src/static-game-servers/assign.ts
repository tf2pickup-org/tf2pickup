import { Mutex } from 'async-mutex'
import { GameServerProvider, type GameNumber } from '../database/models/game.model'
import { findFree } from './find-free'
import { update } from './update'
import { findOne } from './find-one'
import { games } from '../games'
import { GameEventType } from '../database/models/game-event.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

const mutex = new Mutex()

export async function assign(gameNumber: GameNumber, id?: string, actor?: SteamId64) {
  await mutex.runExclusive(async () => {
    const before = id ? await findOne(id) : await findFree()
    const server = await update(
      {
        id: before.id,
      },
      {
        $set: {
          game: gameNumber,
        },
      },
    )

    await games.update(gameNumber, {
      $set: {
        gameServer: {
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
        },
      },
      $push: {
        events: {
          event: GameEventType.gameServerAssigned,
          at: new Date(),
          gameServerName: server.name,
          ...(actor && { actor }),
        },
      },
      $unset: {
        connectString: 1,
        stvConnectString: 1,
      },
    })
  })
}
