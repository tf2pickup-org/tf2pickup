import Anthropic from '@anthropic-ai/sdk'
import type { GameModel } from '../database/models/game.model'
import type { LogsTfLogModel } from '../database/models/logs-tf-log.model'
import type { PlayerModel } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { createSession } from './create-session'
import { skillReviewSystemPrompt, buildSkillReviewPrompt } from './prompts/skill-review'
import { logger } from '../logger'

export interface SkillChange {
  steamId: SteamId64
  playerName: string
  gameClass: string
  previousSkill: number
  newSkill: number
  reasoning: string
}

export interface SkillReview {
  changes: SkillChange[]
  summary: string
}

export async function reviewGameSkills(
  anthropic: Anthropic,
  game: GameModel,
  players: PlayerModel[],
  skillStep: number,
  logData?: LogsTfLogModel,
): Promise<SkillReview | null> {
  const playerMap = new Map(players.map(p => [p.steamId, p]))
  const session = createSession(anthropic, skillReviewSystemPrompt, [])
  const prompt = buildSkillReviewPrompt(game, playerMap, skillStep, logData)

  const { answer } = await session.ask(prompt)

  let parsed: {
    changes: { steamId: string; gameClass: string; newSkill: number; reasoning: string }[]
    summary: string
  }
  try {
    parsed = JSON.parse(answer) as typeof parsed
  } catch {
    logger.warn(
      { gameNumber: game.number, answer },
      'agent skill supervisor: failed to parse JSON response',
    )
    return null
  }

  if (!Array.isArray(parsed.changes) || typeof parsed.summary !== 'string') {
    logger.warn(
      { gameNumber: game.number, parsed },
      'agent skill supervisor: unexpected response shape',
    )
    return null
  }

  const changes: SkillChange[] = parsed.changes.map(c => {
    const player = playerMap.get(c.steamId as SteamId64)
    const slot = game.slots.find(
      s => s.player === c.steamId && s.gameClass === (c.gameClass as Tf2ClassName),
    )
    const previousSkill =
      slot?.skill ?? player?.skill?.[c.gameClass as keyof typeof player.skill] ?? 1

    return {
      steamId: c.steamId as SteamId64,
      playerName: player?.name ?? c.steamId,
      gameClass: c.gameClass,
      previousSkill,
      newSkill: c.newSkill,
      reasoning: c.reasoning,
    }
  })

  return { changes, summary: parsed.summary }
}
