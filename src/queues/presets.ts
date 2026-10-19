import type { z } from 'zod'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import type { createQueueSchema } from '../database/models/queue.model'
import { Gamemode } from '../shared/types/gamemode'

export type QueuePreset = z.input<typeof createQueueSchema> & { maps: MapPoolEntry[] }

// Map pools are the maps most played on live tf2pickup.org instances (and on logs.tf for bball);
// exec configs come from https://github.com/ETF2L/gameserver-configs.
const sixesMaps: MapPoolEntry[] = [
  ...[
    'cp_process_f12',
    'cp_sunshine',
    'cp_gullywash_f9',
    'cp_snakewater_final1',
    'cp_sultry_b8a',
    'cp_metalworks_f7',
    'cp_granary_pro_rc17a3',
    'cp_reckoner_rc6',
  ].map(name => ({ name, execConfig: 'etf2l_6v6_5cp' })),
  ...['koth_product_final', 'koth_bagel_rc12'].map(name => ({
    name,
    execConfig: 'etf2l_6v6_koth',
  })),
]

const highlanderMaps: MapPoolEntry[] = [
  ...[
    'koth_product_final',
    'koth_proot_b5b',
    'koth_warmtic_f10',
    'koth_ashville_final1',
    'koth_proside_v1',
    'koth_cascade_rc2',
  ].map(name => ({ name, execConfig: 'etf2l_9v9_koth' })),
  ...['pl_upward_f12', 'pl_vigil_rc10'].map(name => ({
    name,
    execConfig: 'etf2l_9v9_stopwatch',
  })),
]

const ultiduoMaps: MapPoolEntry[] = [
  'ultiduo_baloo_v2',
  'ultiduo_process_f9',
  'ultiduo_grove_b4',
  'ultiduo_lookout_b1',
  'koth_ultiduo_r_b7',
  'ultiduo_babty_f3',
  'ultiduo_seclusion_b3',
].map(name => ({ name, execConfig: 'etf2l_ultiduo' }))

const bballMaps: MapPoolEntry[] = [
  'bball_tf_v2',
  'ctf_ballin_sky',
  'bball_ozone_ozf',
  'bball_royal4',
  'ctf_ballin_comptf',
  'bball_alpine_b4',
].map(name => ({ name, execConfig: 'etf2l_bball' }))

// Example restriction for the restricted presets: only players an admin has rated above the
// default skill can join.
const restricted = { skillThreshold: 2, requireVerification: true }

export const queuePresets: QueuePreset[] = [
  {
    slug: 'auto-6v6',
    name: '6v6',
    gamemode: Gamemode.sixes,
    launchMode: 'auto',
    maps: sixesMaps,
  },
  {
    slug: 'auto-6v6-restricted',
    name: '6v6 (restricted)',
    gamemode: Gamemode.sixes,
    launchMode: 'auto',
    ...restricted,
    maps: sixesMaps,
  },
  {
    slug: 'auto-9v9',
    name: '9v9',
    gamemode: Gamemode.highlander,
    launchMode: 'auto',
    maps: highlanderMaps,
  },
  {
    slug: 'auto-9v9-restricted',
    name: '9v9 (restricted)',
    gamemode: Gamemode.highlander,
    launchMode: 'auto',
    ...restricted,
    maps: highlanderMaps,
  },
  {
    slug: 'auto-bball',
    name: 'BBall',
    gamemode: Gamemode.bball,
    launchMode: 'auto',
    maps: bballMaps,
  },
  {
    slug: 'auto-ultiduo',
    name: 'Ultiduo',
    gamemode: Gamemode.ultiduo,
    launchMode: 'auto',
    maps: ultiduoMaps,
  },
]
