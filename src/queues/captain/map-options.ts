import { shuffle } from 'es-toolkit'
import type { MapPoolEntry } from '../../database/models/map-pool-entry.model'

export function mapOptions(maps: readonly MapPoolEntry[]): string[] {
  const eligible = maps.filter(map => !map.cooldown)
  const candidates = shuffle(eligible.length ? eligible : [...maps])
  if (!eligible.length) candidates.sort((a, b) => (a.cooldown ?? 0) - (b.cooldown ?? 0))
  return candidates.slice(0, 3).map(map => map.name)
}
