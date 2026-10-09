import { shuffle } from 'es-toolkit'
import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameState } from '../database/models/game.model'
import type { QueueModel } from '../database/models/queue.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events } from '../events'
import { gamemodeConfigs } from '../gamemodes/configs'
import { players } from '../players'
import type { Gamemode } from '../shared/types/gamemode'
import { resolveWhitelistId } from '../queues/resolve-whitelist-id'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { insertGame } from './insert-game'
import { pickTeams, type PlayerSlot } from './pick-teams'

export async function create(
  queue: QueueModel,
  queueSlots: QueueSlotModel[],
  map: string,
  friends: SteamId64[][] = [],
) {
  const { autoBalance } = gamemodeConfigs[queue.gamemode]
  // without balancing, every lineup is as good as any other, so a shuffle picks a random one
  const playerSlots: PlayerSlot[] = autoBalance
    ? await Promise.all(queueSlots.map(slot => queueSlotToPlayerSlot(queue.gamemode, slot)))
    : shuffle(queueSlots.map(slot => ({ ...toPlayerSlot(slot), skill: 0 })))
  const slots = pickTeams(playerSlots, { friends })
  const execConfig = queue.maps.find(({ name }) => name === map)?.execConfig
  const whitelistId = await resolveWhitelistId(queue)

  const { insertedId } = await insertGame({
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
      ...(autoBalance && { skill: slot.skill }),
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

function toPlayerSlot(queueSlot: QueueSlotModel) {
  if (!queueSlot.player) {
    throw new Error(`queue slot ${queueSlot.id} is empty`)
  }
  return { player: queueSlot.player.steamId, gameClass: queueSlot.gameClass }
}

async function queueSlotToPlayerSlot(
  gamemode: Gamemode,
  queueSlot: QueueSlotModel,
): Promise<PlayerSlot> {
  const { player, gameClass } = toPlayerSlot(queueSlot)
  const defaultPlayerSkill = await configuration.get('games.default_player_skill')
  let skill = defaultPlayerSkill[gamemode]?.[gameClass] ?? 1

  const { skill: playerSkill } = await players.bySteamId(player, ['skill'])
  const gamemodeSkill = playerSkill?.[gamemode]
  if (gamemodeSkill && gameClass in gamemodeSkill) {
    skill = gamemodeSkill[gameClass]!
  }

  return { player, gameClass, skill }
}
