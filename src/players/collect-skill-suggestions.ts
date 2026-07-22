import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { defaultElo } from '../games/calculate-elo-updates'
import { makeSkillSuggestions } from './make-skill-suggestions'

export interface PlayerSkillSuggestions {
  player: PlayerModel
  suggestions: ReturnType<typeof makeSkillSuggestions>
}

/**
 * Collects pending skill suggestions for all players, sorted by how far the
 * player's elo has drifted from the default (strongest signal first).
 */
export async function collectSkillSuggestions(): Promise<PlayerSkillSuggestions[]> {
  const candidates = await collections.players.find({ elo: { $exists: true } }).toArray()
  return candidates
    .map(player => ({ player, suggestions: makeSkillSuggestions({ player }) }))
    .filter(({ suggestions }) => suggestions.size > 0)
    .sort((a, b) => eloDrift(b) - eloDrift(a))
}

function eloDrift({ player, suggestions }: PlayerSkillSuggestions): number {
  return Math.max(
    ...[...suggestions.keys()].map(gameClass =>
      Math.abs((player.elo?.[gameClass] ?? defaultElo) - defaultElo),
    ),
  )
}
