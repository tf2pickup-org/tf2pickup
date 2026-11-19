import { minutesToMilliseconds } from 'date-fns'
import type { GameModel } from '../../database/models/game.model'
import { logger } from '../../logger'
import { Tf2Team } from '../../shared/types/tf2-team'
import { tasks } from '../../tasks'
import { findGameChannels } from './find-game-channels'
import { isMumble } from './is-mumble'
import { syncGameAcl } from './sync-game-acl'

export async function close(game: GameModel) {
  if (!(await isMumble())) {
    return
  }

  await tasks.schedule('mumble.cleanupChannel', minutesToMilliseconds(1), {
    gameNumber: game.number,
  })
  await syncGameAcl(game)
  const channels = await findGameChannels(game.number)
  if (channels) {
    await channels[Tf2Team.red].link(channels[Tf2Team.blu])
    logger.info({ game }, `channels linked`)
  }
}
