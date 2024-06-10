import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import {
  PlayerConnectionStatus,
  SlotStatus,
  type GameSlotModel,
} from '../database/models/game-slot.model'
import { GameState, type GameNumber } from '../database/models/game.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { players } from '../players'
import { queue } from '../queue'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { pickTeams, type PlayerSlot } from './pick-teams'

export async function create(
  queueSlots: QueueSlotModel[],
  map: string,
  friends: SteamId64[][] = [],
) {
  const playerSlots: PlayerSlot[] = await Promise.all(queueSlots.map(queueSlotToPlayerSlot))
  const slots = pickTeams(playerSlots, { friends })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { insertedId } = await collections.games.insertOne({
    number: await getNextGameNumber(),
    map,
    state: GameState.created,
    slots: await Promise.all(
      slots.map(async slot => {
        const player = await collections.players.findOne({ steamId: slot.player })
        if (!player) {
          throw new Error(`player not found: ${slot.player}`)
        }

        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          player: player._id,
          team: slot.team,
          gameClass: slot.gameClass,
          status: SlotStatus.active,
          connectionStatus: PlayerConnectionStatus.offline,
          skill: slot.skill,
        } as GameSlotModel
      }),
    ),
    events: [
      {
        at: new Date(),
        event: GameEventType.gameCreated,
      },
    ],
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const game = await collections.games.findOne({ _id: insertedId })
  if (!game) {
    throw new Error('failed creating game')
  }

  events.emit('game:created', { game })
  await Promise.all(
    slots.map(
      async gameSlot =>
        await players.update(gameSlot.player, { $set: { activeGame: game.number } }),
    ),
  )

  await queue.reset()
  return game
}

async function queueSlotToPlayerSlot(queueSlot: QueueSlotModel): Promise<PlayerSlot> {
  if (!queueSlot.player) {
    throw new Error(`queue slot ${queueSlot.id} is empty`)
  }

  const { player, gameClass } = queueSlot
  const defaultPlayerSkill = await configuration.get('games.default_player_skill')
  let skill = defaultPlayerSkill[gameClass]!

  const { skill: playerSkill } = await players.bySteamId(player)
  if (playerSkill && gameClass in playerSkill) {
    skill = playerSkill[gameClass]
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
