import type { GameModel } from '../../database/models/game.model'
import { say } from './commands'
import { withRcon } from './with-rcon'

export async function sayChat(game: GameModel, message: string) {
  await withRcon(game, async ({ rcon }) => {
    await rcon.send(say(message))
  })
}
