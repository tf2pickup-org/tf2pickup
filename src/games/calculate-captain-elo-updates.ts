import { Tf2Team } from '../shared/types/tf2-team'
import type { PlayerModel } from '../database/models/player.model'
import type { GameModel } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { calculateEloUpdates, defaultElo } from './calculate-elo-updates'

// All ladders read the same pre-game snapshot. Only rated captain-mode history
// in this gamemode contributes to their independent provisional counts.
export function calculateCaptainEloUpdates(
  game: GameModel,
  players: ReadonlyMap<SteamId64, Pick<PlayerModel, 'captainModeElo' | 'eloHistory'>>,
) {
  if (game.launchMode !== 'captain') return []

  const rating = (steamId: SteamId64) => players.get(steamId)?.captainModeElo?.[game.gamemode]
  const history = (steamId: SteamId64) =>
    players
      .get(steamId)
      ?.eloHistory?.filter(
        entry => entry.launchMode === 'captain' && entry.gamemode === game.gamemode,
      ) ?? []

  const classes = calculateEloUpdates(
    game,
    (steamId, gameClass) => rating(steamId)?.classes[gameClass] ?? defaultElo,
    (steamId, gameClass) =>
      history(steamId).filter(entry => entry.elo[gameClass] !== undefined).length,
  )
  const overall = calculateEloUpdates(
    game,
    steamId => rating(steamId)?.overall ?? defaultElo,
    steamId => history(steamId).filter(entry => entry.overall !== undefined).length,
    { comparison: 'all' },
  )
  const captain = calculateEloUpdates(
    {
      ...game,
      slots: [Tf2Team.red, Tf2Team.blu].flatMap(team => {
        const player = game.captains?.[team]
        const slot = game.slots.find(slot => slot.team === team)
        return player && slot ? [{ ...slot, player }] : []
      }),
    },
    steamId => rating(steamId)?.captain ?? defaultElo,
    steamId => history(steamId).filter(entry => entry.captain !== undefined).length,
    { comparison: 'all', ignorePlayTime: true },
  )

  const updates = new Map<SteamId64, NonNullable<PlayerModel['eloHistory']>[number]>()
  for (const [ladder, values] of [
    ['elo', classes],
    ['overall', overall],
    ['captain', captain],
  ] as const) {
    for (const value of values) {
      const entry = updates.get(value.steamId) ?? {
        at: value.at,
        game: value.game,
        gamemode: game.gamemode,
        launchMode: 'captain',
        elo: {},
      }
      if (ladder === 'elo') entry.elo[value.gameClass] = value.newElo
      else entry[ladder] = value.newElo
      updates.set(value.steamId, entry)
    }
  }
  return [...updates].map(([steamId, history]) => ({ steamId, history }))
}
