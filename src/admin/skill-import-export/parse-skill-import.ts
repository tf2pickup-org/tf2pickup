import Papa from 'papaparse'
import { z } from 'zod'
import { steamId64 } from '../../shared/schemas/steam-id-64'
import type { PlayerSkill } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { queue } from '../../queue'
import { errors } from '../../errors'

export interface ParsedSkillRow {
  steamId: SteamId64
  skill: PlayerSkill
}

const skillValueSchema = z.union([z.coerce.number(), z.literal('')])

export async function parseSkillImport(csvContent: string): Promise<ParsedSkillRow[]> {
  // Wrap parsing in a promise to yield to the event loop
  const parseResult = await new Promise<Papa.ParseResult<Record<string, string>>>(resolve => {
    setImmediate(() => {
      const result = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(),
      })
      resolve(result)
    })
  })

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw errors.badRequest(
      `CSV parsing error: ${parseResult.errors[0]?.message ?? 'Unknown error'}`,
    )
  }

  if (parseResult.data.length === 0) {
    throw errors.badRequest('CSV must have at least one data row')
  }

  // Check for steamid column
  const firstRow = parseResult.data[0]!
  if (!('steamid' in firstRow)) {
    throw errors.badRequest('CSV must have a steamId column')
  }

  const results: ParsedSkillRow[] = []

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i]!
    const rawSteamId = row['steamid']?.trim()

    if (!rawSteamId) continue

    const parsedSteamId = steamId64.safeParse(rawSteamId)
    if (!parsedSteamId.success) {
      throw errors.badRequest(`Invalid Steam ID on row ${i + 2}: ${rawSteamId}`)
    }

    const skill: PlayerSkill = {}
    // Only import classes that exist in the queue config
    for (const { name: className } of queue.config.classes) {
      const rawValue = row[className]?.trim() ?? ''
      const parsed = skillValueSchema.safeParse(rawValue)
      if (parsed.success && parsed.data !== '') {
        skill[className] = parsed.data
      }
    }

    if (Object.keys(skill).length > 0) {
      results.push({
        steamId: parsedSteamId.data,
        skill,
      })
    }
  }

  return results
}
