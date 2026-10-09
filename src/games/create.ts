import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameNumber } from '../database/models/game.model'
import type { QueueModel } from '../database/models/queue.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { players } from '../players'
import type { Gamemode } from '../shared/types/gamemode'
import { resolveWhitelistId } from '../queues/resolve-whitelist-id'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { pickTeams, type PlayerSlot } from './pick-teams'

export async function create(
  queue: QueueModel,
  queueSlots: QueueSlotModel[],
  map: string,
  friends: SteamId64[][] = [],
) {
  const playerSlots: PlayerSlot[] = await Promise.all(
    queueSlots.map(slot => queueSlotToPlayerSlot(queue.gamemode, slot)),
  )
  const slots = pickTeams(playerSlots, { friends })
  const execConfig = queue.maps.find(({ name }) => name === map)?.execConfig
  const whitelistId = await resolveWhitelistId(queue)

  const { insertedId } = await collections.games.insertOne({
    number: await getNextGameNumber(),
    gamemode: queue.gamemode,
    queue: queue._id,
    map,
    ...(execConfig ? { execConfig } : {}),
    ...(whitelistId ? { whitelistId } : {}),
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

async function queueSlotToPlayerSlot(
  gamemode: Gamemode,
  queueSlot: QueueSlotModel,
): Promise<PlayerSlot> {
  if (!queueSlot.player) {
    throw new Error(`queue slot ${queueSlot.id} is empty`)
  }

  const { player, gameClass } = queueSlot
  const defaultPlayerSkill = await configuration.get('games.default_player_skill')
  let skill = defaultPlayerSkill[gamemode]?.[gameClass] ?? 1

  const { skill: playerSkill } = await players.bySteamId(player.steamId, ['skill'])
  const gamemodeSkill = playerSkill?.[gamemode]
  if (gamemodeSkill && gameClass in gamemodeSkill) {
    skill = gamemodeSkill[gameClass]!
  }

  return { player: player.steamId, gameClass, skill }
}

async function getNextGameNumber(): Promise<GameNumber> {
  const latestGame = await collections.games.findOne({}, { sort: { 'events.0.at': -1 } })
  if (latestGame) {
    return (latestGame.number + 1) as GameNumber
  } else {
    return 1 as GameNumber
  }
}
