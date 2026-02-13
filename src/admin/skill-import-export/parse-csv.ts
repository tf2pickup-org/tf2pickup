import { parse } from 'csv-parse'
import { z } from 'zod'
import { steamId64 } from '../../shared/schemas/steam-id-64'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { PlayerSkill } from '../../database/models/player.model'
import { config } from '../../queue/config'

export interface ParsedPlayerSkill {
  steamId: SteamId64
  name: string | undefined
  skill: PlayerSkill
}

export interface ParseCsvResult {
  success: true
  players: ParsedPlayerSkill[]
}

export interface ParseCsvError {
  success: false
  error: string
}

export async function parseCsv(content: string): Promise<ParseCsvResult | ParseCsvError> {
  const classNames = config.classes.map(c => c.name)

  try {
    const records = await new Promise<Record<string, string>[]>((resolve, reject) => {
      parse(
        content,
        {
          columns: true,
          skipEmptyLines: true,
          relaxColumnCount: true,
          trim: true,
        },
        (err, output: Record<string, string>[]) => {
          if (err) reject(err)
          else resolve(output)
        },
      )
    })

    const players: ParsedPlayerSkill[] = []

    for (let i = 0; i < records.length; i++) {
      const record = records[i]!
      const rowNumber = i + 2 // +2 because of header row and 0-indexing

      // Validate steamId
      const rawSteamId = record['steamId']
      if (!rawSteamId) {
        return { success: false, error: `Row ${rowNumber}: missing steamId` }
      }

      const steamIdResult = steamId64.safeParse(rawSteamId)
      if (!steamIdResult.success) {
        return { success: false, error: `Row ${rowNumber}: invalid steamId "${rawSteamId}"` }
      }

      // Parse skill values
      const skill: PlayerSkill = {}
      for (const className of classNames) {
        const value = record[className]
        if (value !== undefined && value !== '') {
          const parsed = z.coerce.number().safeParse(value)
          if (!parsed.success) {
            return {
              success: false,
              error: `Row ${rowNumber}: invalid ${className} value "${value}"`,
            }
          }
          skill[className] = parsed.data
        }
      }

      players.push({
        steamId: steamIdResult.data,
        name: record['name'] ?? undefined,
        skill,
      })
    }

    return { success: true, players }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: `CSV parsing error: ${error.message}` }
    }
    return { success: false, error: 'Unknown CSV parsing error' }
  }
}
