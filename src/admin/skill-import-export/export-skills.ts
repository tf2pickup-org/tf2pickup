import Papa from 'papaparse'
import { collections } from '../../database/collections'
import { queue } from '../../queue'

export async function exportSkills(): Promise<string> {
  const players = await collections.players
    .find({ skill: { $exists: true } }, { projection: { steamId: 1, name: 1, skill: 1 } })
    .toArray()

  const classes = queue.config.classes.map(({ name }) => name)

  const data = players.map(player => {
    const row: Record<string, string | number> = {
      steamId: player.steamId,
      name: player.name,
    }
    for (const className of classes) {
      const value = player.skill?.[className]
      row[className] = value ?? ''
    }
    return row
  })

  // Wrap unparse in setImmediate to yield to the event loop
  return new Promise(resolve => {
    setImmediate(() => {
      const csv = Papa.unparse(data, {
        columns: ['steamId', 'name', ...classes],
      })
      resolve(csv)
    })
  })
}
