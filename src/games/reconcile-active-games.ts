import { collections } from '../database/collections'
import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { runningGameStates } from './lifecycle/running-game-states'
import { setActiveGame } from './set-active-game'

// Occupancy writes sit next to game writes without a transaction; a crash between the two
// leaves players stuck in (or missing from) a game. Players with a pending games.freePlayer task
// are serving their post-game cooldown and are left to it.
export async function reconcileActiveGames() {
  const running = await collections.games
    .find({ state: { $in: runningGameStates } }, { projection: { number: 1, 'slots.player': 1 } })
    .toArray()
  const seats = new Map<SteamId64, GameNumber>(
    running.flatMap(({ number, slots }) => slots.map(({ player }) => [player, number])),
  )
  const coolingDown = new Set(
    (await collections.tasks.find({ name: 'games.freePlayer' }).toArray()).map(
      ({ args }) => (args as { player: SteamId64 }).player,
    ),
  )
  const candidates = await collections.players
    .find(
      { $or: [{ activeGame: { $exists: true } }, { steamId: { $in: [...seats.keys()] } }] },
      { projection: { steamId: 1, activeGame: 1 } },
    )
    .toArray()

  for (const { steamId, activeGame } of candidates) {
    const seat = seats.get(steamId)
    if (seat === activeGame || (seat === undefined && coolingDown.has(steamId))) {
      continue
    }
    await setActiveGame(steamId, seat)
  }
}
