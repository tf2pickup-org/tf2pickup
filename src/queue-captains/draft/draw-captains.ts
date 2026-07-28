import { sample } from 'es-toolkit'
import type { CaptainsPoolEntryModel } from '../../database/models/captains-pool-entry.model'
import { errors } from '../../errors'
import type { QueueConfig } from '../../queue/types/queue-config'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2Team } from '../../shared/types/tf2-team'
import { isFeasible } from '../matching/is-feasible'
import { teamSlots } from '../team-slots'

/**
 * Pick two captains at random from the volunteers.
 *
 * Random rather than by rating: it cannot be gamed, and it spreads captaincy around instead of
 * handing it to the same two players every night. Which side each gets is a coin flip too.
 *
 * A pair that could not both be fitted into the game is rejected and another drawn. In practice
 * this never bites — both teams have the same slots, so any pool that fills them unpinned fills
 * them pinned as well — but the draft is unrecoverable if it starts from an impossible position,
 * so it is worth the few microseconds to be sure.
 */
export function drawCaptains(
  pool: CaptainsPoolEntryModel[],
  config: QueueConfig,
): Record<Tf2Team, SteamId64> {
  const volunteers = pool.filter(entry => entry.wantsToCaptain)
  if (volunteers.length < 2) {
    throw errors.conflict('not enough captain volunteers')
  }

  const slots = teamSlots(config)
  const candidates = pool.map(({ player, gameClasses }) => ({
    steamId: player.steamId,
    gameClasses,
  }))

  const tried = new Set<string>()
  const combinations = volunteers.length * (volunteers.length - 1)

  while (tried.size < combinations) {
    const [blu, red] = sample2(volunteers)
    const key = `${blu}:${red}`
    if (tried.has(key)) {
      continue
    }
    tried.add(key)

    const pinned = candidates.map(candidate => ({
      ...candidate,
      ...(candidate.steamId === blu && { team: Tf2Team.blu }),
      ...(candidate.steamId === red && { team: Tf2Team.red }),
    }))

    if (isFeasible(slots, pinned)) {
      return { [Tf2Team.blu]: blu, [Tf2Team.red]: red }
    }
  }

  throw errors.conflict('no pair of volunteers can captain this pool')
}

function sample2(volunteers: CaptainsPoolEntryModel[]): [SteamId64, SteamId64] {
  const blu = sample(volunteers)
  const red = sample(volunteers.filter(entry => entry !== blu))
  return [blu.player.steamId, red.player.steamId]
}
