import { Gamemode } from '../../shared/types/gamemode'
import type { MapPoolEntry } from '../../database/models/map-pool-entry.model'
import { set } from './set'

// Representative ETF2L-style defaults; ops are expected to review/customize the
// pool per gamemode in the admin panel.
export const defaultMapPools: Partial<Record<Gamemode, MapPoolEntry[]>> = {
  [Gamemode.sixes]: [
    { name: 'cp_process_final', execConfig: 'etf2l_6v6_5cp' },
    { name: 'cp_snakewater_final1', execConfig: 'etf2l_6v6_5cp' },
    { name: 'cp_sunshine', execConfig: 'etf2l_6v6_5cp' },
    { name: 'cp_granary_pro_rc8', execConfig: 'etf2l_6v6_5cp' },
    { name: 'cp_gullywash_final1', execConfig: 'etf2l_6v6_5cp' },
    { name: 'cp_metalworks', execConfig: 'etf2l_6v6_5cp' },
  ],
  [Gamemode.highlander]: [
    { name: 'pl_upward_f12', execConfig: 'etf2l_9v9_stopwatch' },
    { name: 'pl_swiftwater_final1', execConfig: 'etf2l_9v9_stopwatch' },
    { name: 'koth_product_final', execConfig: 'etf2l_9v9_koth' },
    { name: 'koth_lakeside_f5', execConfig: 'etf2l_9v9_koth' },
    { name: 'cp_steel_f12', execConfig: 'etf2l_9v9_stopwatch' },
    { name: 'koth_ashville_final1', execConfig: 'etf2l_9v9_koth' },
  ],
}

export async function reset(gamemode: Gamemode): Promise<MapPoolEntry[]> {
  const pool = defaultMapPools[gamemode]
  if (!pool) {
    return []
  }
  return set(gamemode, pool)
}
