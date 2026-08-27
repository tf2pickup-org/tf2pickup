import { stringify } from 'csv-stringify/sync'
import { collections } from '../../database/collections'
import { gamemodeConfigs } from '../../gamemodes/configs'
import type { Gamemode } from '../../shared/types/gamemode'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'

interface ExportedPlayerSkill extends Partial<Record<Tf2ClassName, string | number>> {
  steamId: string
  name: string
}

export async function exportSkills(gamemode: Gamemode): Promise<string> {
  const classNames = gamemodeConfigs[gamemode].classes.map(c => c.name)

  const players = await collections.players
    .find(
      { [`skill.${gamemode}`]: { $exists: true, $ne: {} } },
      { projection: { steamId: 1, name: 1, skill: 1 } },
    )
    .toArray()

  const rows = players.map(player => {
    const row: ExportedPlayerSkill = {
      steamId: player.steamId,
      name: player.name,
    }

    for (const className of classNames) {
      row[className] = player.skill?.[gamemode]?.[className] ?? ''
    }

    return row
  })

  const columns = ['steamId', 'name', ...classNames]

  return stringify(rows, { header: true, columns })
}
