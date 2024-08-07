import type { MapPoolEntry } from '../../database/models/map-pool-entry.model'
import { set } from './set'

export const defaultMapPool: MapPoolEntry[] = [
  {
    name: 'cp_process_final',
    execConfig: 'etf2l_6v6_5cp',
  },
  {
    name: 'cp_snakewater_final1',
    execConfig: 'etf2l_6v6_5cp',
  },
  {
    name: 'cp_sunshine',
    execConfig: 'etf2l_6v6_5cp',
  },
  {
    name: 'cp_granary_pro_rc8',
    execConfig: 'etf2l_6v6_5cp',
  },
  {
    name: 'cp_gullywash_final1',
    execConfig: 'etf2l_6v6_5cp',
  },
  {
    name: 'cp_metalworks',
    execConfig: 'etf2l_6v6_5cp',
  },
]

export async function reset(): Promise<MapPoolEntry[]> {
  return set(defaultMapPool)
}
