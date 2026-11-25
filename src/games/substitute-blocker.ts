import type { GameSlotModel } from '../database/models/game-slot.model'
import type { PlayerModel } from '../database/models/player.model'
import { active } from '../players/restrictions/active'

// The single eligibility rule for taking a slot: the UI shows the reason on a locked slot and
// games/lifecycle/replace.ts rejects with it. The player who was substituted out may always
// return to their own slot.
export function substituteBlocker(
  slot: Pick<GameSlotModel, 'player'>,
  actor: Pick<PlayerModel, 'steamId' | 'activeGame' | 'bans'> | null,
): string | null {
  if (!actor) {
    return 'Sign in to substitute'
  }

  if (actor.steamId === slot.player) {
    return null
  }

  if (actor.activeGame !== undefined) {
    return 'You are already in a game'
  }

  if (active(actor, 'ban').length > 0) {
    return 'You have active bans'
  }

  return null
}
