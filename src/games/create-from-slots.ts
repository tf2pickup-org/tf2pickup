import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import type { DraftId } from '../database/models/draft.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { Tf2Team } from '../shared/types/tf2-team'
import type { GameSlotId } from '../shared/types/game-slot-id'

export interface GameSlotSpec {
  id: GameSlotId
  player: SteamId64
  team: Tf2Team
  gameClass: Tf2ClassName
  skill?: number
  isCaptain?: boolean
}

/**
 * Create a game from teams that are already decided. Auto mode gets here through `create()` once it
 * has balanced them; captain mode hands over the roster its draft produced.
 */
export async function createFromSlots(
  slots: GameSlotSpec[],
  map: string,
  draft?: DraftId,
): Promise<GameModel> {
  const { insertedId } = await collections.games.insertOne({
    number: await getNextGameNumber(),
    map,
    state: GameState.created,
    ...(draft && { draft }),
    slots: slots.map(slot => ({
      id: slot.id,
      player: slot.player,
      team: slot.team,
      gameClass: slot.gameClass,
      status: SlotStatus.active,
      connectionStatus: PlayerConnectionStatus.offline,
      ...(slot.skill !== undefined && { skill: slot.skill }),
      ...(slot.isCaptain && { isCaptain: true }),
    })),
    events: [
      {
        at: new Date(),
        event: GameEventType.gameCreated,
      },
    ],
  })

  const game = await collections.games.findOne({ _id: insertedId })
  if (!game) {
    throw new Error('failed creating game')
  }

  events.emit('game:created', { game })
  return game
}

async function getNextGameNumber(): Promise<GameNumber> {
  const latestGame = await collections.games.findOne({}, { sort: { 'events.0.at': -1 } })
  return latestGame ? ((latestGame.number + 1) as GameNumber) : (1 as GameNumber)
}
