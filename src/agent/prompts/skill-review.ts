import type { GameModel } from '../../database/models/game.model'
import type { LogsTfLogModel } from '../../database/models/logs-tf-log.model'
import type { PlayerModel } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'

export const skillReviewSystemPrompt = `You are a skill calibration assistant for a TF2 pickup game server.
After each game you review player performance and decide whether to adjust player skill values.

Guidelines:
- Be conservative. Only suggest a change when performance clearly warrants it. One bad game is not enough unless it is extreme.
- Consider game context: losing-team players may underperform due to team composition, not individual skill.
- Adjust skill by exactly one step (provided in the prompt). Never suggest partial or multi-step changes.
- For medics: judge by HPM (heals per minute) and uber/drop ratio.
- For other classes: judge by DPM and K/D ratio.
- When log stats are unavailable, rely on game score and the class played; be even more conservative.

Your response MUST be a valid JSON object with NO markdown fences, NO explanation outside the JSON — just raw JSON:
{
  "changes": [
    {
      "steamId": "<SteamID64 string>",
      "gameClass": "<class name>",
      "newSkill": <number>,
      "reasoning": "<one or two sentences>"
    }
  ],
  "summary": "<brief overall assessment>"
}
An empty changes array is valid when no adjustments are needed.`

export function buildSkillReviewPrompt(
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
