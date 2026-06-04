import { collections } from '../database/collections'
import { GameState, type GameNumber } from '../database/models/game.model'
import type { PlayerSkill, PlayerStats } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { update } from './update'
import { activityLog } from '../activity-log'

interface SetSkillParams {
  steamId: SteamId64
  skill: PlayerSkill
  actor: SteamId64
}

export async function setSkill({ steamId, skill, actor }: SetSkillParams) {
  const [lastGame, gamesByClass, player] = await Promise.all([
    getLastGameNumber(),
    getGamesByClass(steamId),
    collections.players.findOne({ steamId }, { projection: { skill: 1 } }),
  ])
  const oldSkill = player?.skill ?? {}
  await update(
    steamId,
    {
      $set: { skill },
      $push: {
        skillHistory: {
          at: new Date(),
          skill,
          actor,
          lastGame,
          gamesByClass,
        },
      },
    },
    {},
    actor,
  )
  if (!isSkillEqual(oldSkill, skill)) {
    await activityLog.record({
      type: 'player skill change',
      player: steamId,
      oldSkill,
      newSkill: skill,
      actor,
    })
  }
}

async function getLastGameNumber(): Promise<GameNumber | undefined> {
  const latestGame = await collections.games.findOne(
    { state: GameState.ended },
    { sort: { 'events.0.at': -1 }, projection: { number: 1 } },
  )
  return latestGame?.number
}

async function getGamesByClass(steamId: SteamId64): Promise<PlayerStats['gamesByClass']> {
  const player = await collections.players.findOne(
    { steamId },
    { projection: { 'stats.gamesByClass': 1 } },
  )
  return player?.stats.gamesByClass ?? {}
}

function isSkillEqual(a: PlayerSkill, b: PlayerSkill): boolean {
  const aEntries = Object.entries(a)
  const bEntries = Object.entries(b)
  if (aEntries.length !== bEntries.length) return false
  return aEntries.every(([k, v]) => b[k as keyof PlayerSkill] === v)
}
