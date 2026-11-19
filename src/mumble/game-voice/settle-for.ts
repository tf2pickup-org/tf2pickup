import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'
import { settle } from './settle'

export async function settleFor(userHash: string) {
  const player = await collections.players.findOne(
    { 'mumbleCertificate.hash': userHash },
    { projection: { steamId: 1 } },
  )
  const game =
    player &&
    (await collections.games.findOne(
      {
        state: { $in: [GameState.launching, GameState.started] },
        'slots.player': player.steamId,
        'slots.voiceOutgoing.0': { $exists: true },
      },
      { projection: { number: 1 } },
    ))
  if (game) {
    await settle(game.number)
  }
}
