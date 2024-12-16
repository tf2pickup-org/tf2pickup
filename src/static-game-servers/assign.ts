import { Mutex } from 'async-mutex'
import type { GameModel } from '../database/models/game.model'
import { findFree } from './find-free'
import { update } from './update'

const mutex = new Mutex()

export async function assign(game: GameModel) {
  return await mutex.runExclusive(async () => {
    const before = await findFree()
    if (!before) {
      throw new Error(`no free servers available for game ${game.number}`)
    }

    return await update(
      {
        id: before.id,
      },
      {
        $set: {
          game: game.number,
        },
      },
    )
  })
}
