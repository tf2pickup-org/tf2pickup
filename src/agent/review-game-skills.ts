import Anthropic from '@anthropic-ai/sdk'
import type { GameModel } from '../database/models/game.model'
import type { LogsTfLogModel } from '../database/models/logs-tf-log.model'
import type { PlayerModel } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2ClassName } from '../shared/types/tf2-class-name'

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

const submitReviewTool: Anthropic.Tool = {
  name: 'submit_review',
  description: 'Submit the final skill adjustment recommendations for this game.',
  input_schema: {
    type: 'object' as const,
    properties: {
      changes: {
        type: 'array',
        description: 'Players whose skill should change. Omit players who should stay the same.',
        items: {
          type: 'object',
          properties: {
            steamId: { type: 'string' },
            gameClass: { type: 'string' },
            newSkill: { type: 'number' },
            reasoning: {
              type: 'string',
              description: 'One or two sentences explaining the change.',
            },
          },
          required: ['steamId', 'gameClass', 'newSkill', 'reasoning'],
        },
      },
      summary: {
        type: 'string',
        description:
          'Brief overall assessment of the game and the reasoning behind the changes (or why no changes were made).',
      },
    },
    required: ['changes', 'summary'],
  },
}

function buildPrompt(
  game: GameModel,
  playerMap: Map<SteamId64, PlayerModel>,
  skillStep: number,
  logData: LogsTfLogModel | undefined,
): string {
  const lines: string[] = [
    `Game #${game.number} — ${game.map}`,
    game.score ? `Score: BLU ${game.score.blu} — RED ${game.score.red}` : 'Score: unknown',
    `Skill step: ${skillStep} (you may only adjust skill by this exact amount up or down)`,
    '',
    '## Players',
  ]

  const gameLengthMin = logData ? logData.data.length / 60 : 0

  for (const slot of game.slots) {
    const player = playerMap.get(slot.player)
    if (!player) continue

    const currentSkill = slot.skill ?? player.skill?.[slot.gameClass] ?? 1
    lines.push(``, `### ${player.name} (${slot.team}, ${slot.gameClass}, skill ${currentSkill})`)
    lines.push(`SteamID64: ${slot.player}`)

    if (logData?.data.players) {
      const accountId = BigInt(slot.player) - 76561197960265728n
      const steamId3 = `[U:1:${accountId}]`
      const stats = logData.data.players[steamId3]

      if (stats) {
        if (slot.gameClass === Tf2ClassName.medic) {
          const hpm = gameLengthMin > 0 ? Math.round(stats.heal / gameLengthMin) : 0
          lines.push(
            `HPM: ${hpm}, Ubers: ${stats.ubers}, Drops: ${stats.drops}, Deaths: ${stats.deaths}`,
          )
        } else {
          lines.push(
            `DPM: ${stats.dapm}, K/D: ${stats.kpd}, Kills: ${stats.kills}, Deaths: ${stats.deaths}`,
          )
        }
      } else {
        lines.push('(no log stats available for this player)')
      }
    }
  }

  return lines.join('\n')
}

export async function reviewGameSkills(
  anthropic: Anthropic,
  game: GameModel,
  players: PlayerModel[],
  skillStep: number,
  logData?: LogsTfLogModel,
): Promise<SkillReview | null> {
  const playerMap = new Map(players.map(p => [p.steamId, p]))

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: `You are a skill calibration assistant for a TF2 pickup game server.
After each game you review player performance and decide whether to adjust player skill values.

Guidelines:
- Be conservative. Only suggest a change when performance clearly warrants it. One bad game is not enough unless it is extreme.
- Consider game context: losing-team players may underperform due to team composition, not individual skill.
- Adjust skill by exactly one step (provided in the prompt). Never suggest partial or multi-step changes.
- For medics: judge by HPM (heals per minute) and uber/drop ratio.
- For other classes: judge by DPM and K/D ratio.
- When log stats are unavailable, rely on game score and the class played; be even more conservative.
- You MUST call submit_review. An empty changes array is valid when no adjustments are needed.`,
    messages: [{ role: 'user', content: buildPrompt(game, playerMap, skillStep, logData) }],
    tools: [submitReviewTool],
    tool_choice: { type: 'tool', name: 'submit_review' },
  })

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_review',
  )
  if (!toolUse) return null

  const input = toolUse.input as {
    changes: { steamId: string; gameClass: string; newSkill: number; reasoning: string }[]
    summary: string
  }

  const changes: SkillChange[] = input.changes.map(c => {
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

  return { changes, summary: input.summary }
}
