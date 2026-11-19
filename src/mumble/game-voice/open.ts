import { CommandTimedOutError } from '@tf2pickup-org/mumble-client'
import type { GameModel } from '../../database/models/game.model'
import { games } from '../../games'
import { logger } from '../../logger'
import { Tf2Team } from '../../shared/types/tf2-team'
import { withLogLevel } from '../../utils/with-log-level'
import { isMumble } from './is-mumble'
import { mumbleVoiceServer } from './mumble-voice-server'
import { syncGameAcl } from './sync-game-acl'
import { voiceUrl } from './voice-url'

export async function open(game: GameModel) {
  if (!(await isMumble())) {
    return
  }

  const gamesChannel = await mumbleVoiceServer.gamesChannel()
  if (!gamesChannel) {
    throw new Error(`mumble games channel unavailable`)
  }

  try {
    const channel = await gamesChannel.createSubChannel(`${game.number}`)
    await Promise.all(
      [Tf2Team.blu, Tf2Team.red].map(
        async team => await channel.createSubChannel(team.toUpperCase()),
      ),
    )
  } catch (error) {
    // Mumble command timeouts are transient (server busy / packet loss); channel
    // setup retries on the next game, so this isn't a server fault.
    if (error instanceof CommandTimedOutError) {
      throw withLogLevel(error, 'warn')
    }
    throw error
  }

  const urls = await Promise.all(game.slots.map(async slot => await voiceUrl(game, slot.player)))
  await games.update(
    game.number,
    { $set: Object.fromEntries(urls.map((url, i) => [`slots.$[s${i}].voiceServerUrl`, url])) },
    { arrayFilters: game.slots.map(({ id }, i) => ({ [`s${i}.id`]: id })) },
  )
  logger.info({ game }, 'channels for game created')
  await syncGameAcl(game)
}
