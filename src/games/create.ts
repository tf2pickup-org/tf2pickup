import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { GameEventType } from '../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../database/models/game-slot.model'
import { GameState, type GameModel, type GameNumber } from '../database/models/game.model'
import type { DraftModel } from '../database/models/draft.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { environment } from '../environment'
import { events } from '../events'
import { players } from '../players'
import { queueConfigs } from '../queue-auto/configs'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2Team } from '../shared/types/tf2-team'
import { pickTeams, type PlayerSlot, type PlayerSlotWithTeam } from './pick-teams'

export async function create(
  queueSlots: QueueSlotModel[],
  map: string,
  friends?: SteamId64[][],
): Promise<GameModel>
export async function create(captainDraft: DraftModel, map: string): Promise<GameModel>
export async function create(
  slotsOrDraft: QueueSlotModel[] | DraftModel,
  map: string,
  friends: SteamId64[][] = [],
): Promise<GameModel> {
  let slots: ReturnType<typeof pickTeams>
  let captains: Record<Tf2Team, SteamId64> | undefined

  if (Array.isArray(slotsOrDraft)) {
    const playerSlots: PlayerSlot[] = await Promise.all(slotsOrDraft.map(queueSlotToPlayerSlot))
    slots = pickTeams(playerSlots, { friends })
  } else {
    slots = buildSlotsFromDraft(slotsOrDraft)
    captains = slotsOrDraft.captains
  }

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
    ...(captains ? { captains } : {}),
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

  const { skill: playerSkill } = await players.bySteamId(player.steamId, ['skill'])
  if (playerSkill && gameClass in playerSkill) {
    skill = playerSkill[gameClass]!
  }

  return { player: player.steamId, gameClass, skill }
}

function buildSlotsFromDraft(draft: DraftModel): PlayerSlotWithTeam[] {
  const config = queueConfigs[environment.QUEUE_CONFIG]
  const classCounters: Partial<Record<`${Tf2Team}-${Tf2ClassName}`, number>> = {}

  const result: PlayerSlotWithTeam[] = []

  for (const p of draft.picks) {
    const key: `${Tf2Team}-${Tf2ClassName}` = `${p.team}-${p.gameClass}`
    classCounters[key] = (classCounters[key] ?? 0) + 1
    result.push({
      player: p.player,
      gameClass: p.gameClass,
      team: p.team,
      id: `${p.team}-${p.gameClass}-${classCounters[key]}`,
      skill: 0,
    })
  }

  for (const [team, captainId] of Object.entries(draft.captains) as [Tf2Team, SteamId64][]) {
    const teamPicks = draft.picks.filter(p => p.team === team)
    const usedClasses: Partial<Record<Tf2ClassName, number>> = {}
    for (const p of teamPicks) {
      usedClasses[p.gameClass] = (usedClasses[p.gameClass] ?? 0) + 1
    }

    let captainClass: Tf2ClassName | undefined
    for (const cls of config.classes) {
      const used = usedClasses[cls.name] ?? 0
      if (used < cls.count) {
        captainClass = cls.name
        break
      }
    }

    if (!captainClass) continue

    const key: `${Tf2Team}-${Tf2ClassName}` = `${team}-${captainClass}`
    classCounters[key] = (classCounters[key] ?? 0) + 1
    result.push({
      player: captainId,
      gameClass: captainClass,
      team,
      id: `${team}-${captainClass}-${classCounters[key]}`,
      skill: 0,
    })
  }

  return result
}

async function getNextGameNumber(): Promise<GameNumber> {
  const latestGame = await collections.games.findOne({}, { sort: { 'events.0.at': -1 } })
  if (latestGame) {
    return (latestGame.number + 1) as GameNumber
  } else {
    return 1 as GameNumber
  }
}
