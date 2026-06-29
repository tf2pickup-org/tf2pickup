import type { StrictUpdateFilter } from 'mongodb'
import { collections } from '../database/collections'
import { GameState, type GameNumber } from '../database/models/game.model'
import type { ClassCount, PlayerModel, PlayerSkill } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Gamemode } from '../shared/types/gamemode'
import { currentGamemode } from '../shared/current-gamemode'
import { update } from './update'
import { activityLog } from '../activity-log'
import { isEqual } from 'es-toolkit'

interface SetSkillParams {
  steamId: SteamId64
  skill: PlayerSkill
  actor: SteamId64
  gamemode?: Gamemode
}

export async function setSkill({
  steamId,
  skill,
  actor,
  gamemode = currentGamemode,
}: SetSkillParams) {
  const [lastGame, gamesByClass, player] = await Promise.all([
    getLastGameNumber(),
    getGamesByClass(steamId, gamemode),
    collections.players.findOne({ steamId }, { projection: { skill: 1 } }),
  ])
  const oldSkill = player?.skill?.[gamemode] ?? {}
  await update(
    steamId,
    {
      $set: { [`skill.${gamemode}`]: skill } as NonNullable<
        StrictUpdateFilter<PlayerModel>['$set']
      >,
      $push: {
        skillHistory: {
          at: new Date(),
          gamemode,
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
  if (!isEqual(oldSkill, skill)) {
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

async function getGamesByClass(steamId: SteamId64, gamemode: Gamemode): Promise<ClassCount> {
  const player = await collections.players.findOne(
    { steamId },
    { projection: { 'stats.gamesByClass': 1 } },
  )
  return player?.stats.gamesByClass[gamemode] ?? {}
}
