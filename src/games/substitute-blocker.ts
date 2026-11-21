import type { GameSlotModel } from '../database/models/game-slot.model'
import type { PlayerModel } from '../database/models/player.model'
import { hasActiveBan } from '../players/has-active-ban'

// Mirrors the checks of games/lifecycle/replace.ts so that a locked slot explains exactly why the
// actor would be rejected if they tried to take it. The player who was substituted out may always
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

  if (hasActiveBan(actor)) {
    return 'You have active bans'
  }

  return null
}
