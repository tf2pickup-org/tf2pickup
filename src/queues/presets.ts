import type { z } from 'zod'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import type { createQueueSchema } from '../database/models/queue.model'
import { Gamemode } from '../shared/types/gamemode'

export type QueuePreset = z.input<typeof createQueueSchema> & { maps: MapPoolEntry[] }

// Map pools are the maps most played on live tf2pickup.org instances (and on logs.tf for bball);
// exec configs come from https://github.com/ETF2L/gameserver-configs. ETF2L has no 4v4 or
// ultitrio configs, so those presets exec none.
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

const foursMaps: MapPoolEntry[] = [
  'koth_product_final',
  'koth_bagel_rc12',
  'koth_harter_rc1',
  'koth_maple_ridge_rc2',
  'koth_badlands',
  'koth_airfield_b7',
  'koth_highpass',
].map(name => ({ name }))

const ultitrioMaps: MapPoolEntry[] = [
  'ulti_fira_b2a',
  'ultitrio_caffa_final8',
  'ultitrio_aesthetic_b9',
  'ultitrio_eruption_v4',
  'ultitrio_dockport_final6',
  'ultitrio_staten_b2',
].map(name => ({ name }))

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
    slug: 'captain-6v6',
    name: '👑 6v6',
    gamemode: Gamemode.sixes,
    launchMode: 'captain',
    maps: sixesMaps,
  },
  {
    slug: 'auto-6v6-restricted',
    name: '🔒 6v6',
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
    slug: 'captain-9v9',
    name: '👑 9v9',
    gamemode: Gamemode.highlander,
    launchMode: 'captain',
    maps: highlanderMaps,
  },
  {
    slug: 'auto-9v9-restricted',
    name: '🔒 9v9',
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
  {
    slug: 'auto-4v4',
    name: '4v4',
    gamemode: Gamemode.fours,
    launchMode: 'auto',
    maps: foursMaps,
  },
  {
    slug: 'auto-ultitrio',
    name: 'Ultitrio',
    gamemode: Gamemode.ultitrio,
    launchMode: 'auto',
    maps: ultitrioMaps,
  },
]
