import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameNumber } from '../database/models/game.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { pickTeams, type PlayerSlot } from './pick-teams'

export async function create(
  queueSlots: QueueSlotModel[],
  map: string,
  friends: SteamId64[][] = [],
) {
  const playerSlots: PlayerSlot[] = await Promise.all(queueSlots.map(queueSlotToPlayerSlot))
  const slots = pickTeams(playerSlots, { friends })

  const { insertedId } = await collections.games.insertOne({
    number: await getNextGameNumber(),
    map,
    state: GameState.created,
    slots: slots.map(slot => ({
      id: slot.id,
      player: slot.player,
      team: slot.team,
      gameClass: slot.gameClass,
      status: SlotStatus.active,
      connectionStatus: PlayerConnectionStatus.offline,
      skill: slot.skill,
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

async function queueSlotToPlayerSlot(queueSlot: QueueSlotModel): Promise<PlayerSlot> {
  if (!queueSlot.player) {
    throw new Error(`queue slot ${queueSlot.id} is empty`)
  }

  const { player, gameClass } = queueSlot
  const defaultPlayerSkill = await configuration.get('games.default_player_skill')
  let skill = defaultPlayerSkill[gameClass]!

  const { skill: playerSkill } = await players.bySteamId(player, ['skill'])
  if (playerSkill && gameClass in playerSkill) {
    skill = playerSkill[gameClass]!
  }

  return { player, gameClass, skill }
}

async function getNextGameNumber(): Promise<GameNumber> {
  const latestGame = await collections.games.findOne({}, { sort: { 'events.0.at': -1 } })
  if (latestGame) {
    return (latestGame.number + 1) as GameNumber
  } else {
    return 1 as GameNumber
  }
}
