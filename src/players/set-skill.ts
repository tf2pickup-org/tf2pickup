import { collections } from '../database/collections'
import { GameState, type GameNumber } from '../database/models/game.model'
import type { PlayerSkill } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { update } from './update'

interface SetSkillParams {
  steamId: SteamId64
  skill: PlayerSkill
  actor: SteamId64
}

export async function setSkill({ steamId, skill, actor }: SetSkillParams) {
  const lastGame = await getLastGameNumber()
  await update(steamId, {
    $set: { skill },
    $push: {
      skillHistory: {
        at: new Date(),
        skill,
        actor,
        lastGame,
      },
    },
  })
}

async function getLastGameNumber(): Promise<GameNumber | undefined> {
  const latestGame = await collections.games.findOne(
    { state: GameState.ended },
    { sort: { 'events.0.at': -1 }, projection: { number: 1 } },
  )
  if (latestGame) {
    return latestGame.number
  } else {
    return undefined
  }
}
