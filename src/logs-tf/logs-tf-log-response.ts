import { z } from 'zod'

const weaponStatsSchema = z.record(
  z.string(),
  z.object({
    kills: z.number(),
    dmg: z.number(),
    avg_dmg: z.number(),
    shots: z.number(),
    hits: z.number(),
  }),
)

const classStatsSchema = z.object({
  type: z.string(),
  kills: z.number(),
  assists: z.number(),
  deaths: z.number(),
  dmg: z.number(),
  weapon: weaponStatsSchema,
  total_time: z.number(),
})

const playerStatsSchema = z.object({
  team: z.enum(['Red', 'Blue']),
  class_stats: z.array(classStatsSchema),
  kills: z.number(),
  deaths: z.number(),
  assists: z.number(),
  suicides: z.number(),
  kapd: z.string(),
  kpd: z.string(),
  dmg: z.number(),
  dmg_real: z.number().optional(),
  dt: z.number(),
  dt_real: z.number().optional(),
  hr: z.number().optional(),
  lks: z.number(),
  as: z.number().optional(),
  dapd: z.number(),
  dapm: z.number(),
  ubers: z.number(),
  ubertypes: z.record(z.string(), z.number()),
  drops: z.number(),
  medkits: z.number().optional(),
  medkits_hp: z.number().optional(),
  backstabs: z.number().optional(),
  headshots: z.number().optional(),
  headshots_hit: z.number().optional(),
  sentries: z.number().optional(),
  heal: z.number(),
  cpc: z.number().optional(),
  ic: z.number().optional(),
  medicstats: z.unknown().optional(),
})

const teamStatsSchema = z.object({
  score: z.number(),
  kills: z.number(),
  deaths: z.number(),
  dmg: z.number(),
  charges: z.number(),
  drops: z.number(),
  firstcaps: z.number(),
  caps: z.number(),
})

const roundEventSchema = z.object({
  type: z.string(),
  time: z.number(),
  team: z.string().optional(),
  point: z.number().optional(),
  steamid: z.string().optional(),
  killer: z.string().optional(),
  medigun: z.string().optional(),
})

const roundSchema = z.object({
  start_time: z.number(),
  winner: z.enum(['Red', 'Blue']),
  team: z.record(
    z.string(),
    z.object({ score: z.number(), kills: z.number(), dmg: z.number(), ubers: z.number() }),
  ),
  events: z.array(roundEventSchema),
  players: z.record(
    z.string(),
    z.object({ team: z.string().nullish(), kills: z.number(), dmg: z.number() }),
  ),
  firstcap: z.string().nullable(),
  length: z.number(),
})

const infoSchema = z.object({
  map: z.string(),
  supplemental: z.boolean(),
  total_length: z.number(),
  hasRealDamage: z.boolean(),
  hasWeaponDamage: z.boolean(),
  hasAccuracy: z.boolean(),
  hasHP: z.boolean(),
  hasHP_real: z.boolean(),
  hasHS: z.boolean(),
  hasHS_hit: z.boolean().optional(),
  hasHS_real: z.boolean().optional(),
  hasBS: z.boolean(),
  hasCP: z.boolean().optional(),
  hasSB: z.boolean(),
  hasDT: z.boolean().optional(),
  hasAS: z.boolean().optional(),
  hasHR: z.boolean(),
  hasMedStats: z.boolean().optional(),
  hasIntel: z.boolean(),
  AD_scoring: z.boolean(),
  notifications: z.array(z.unknown()),
  title: z.string(),
  date: z.number(),
  uploader: z.object({ id: z.string(), name: z.string(), info: z.string() }),
})

export const logsTfLogResponseSchema = z.object({
  version: z.number(),
  teams: z.record(z.string(), teamStatsSchema),
  length: z.number(),
  players: z.record(z.string(), playerStatsSchema),
  names: z.record(z.string(), z.string()),
  rounds: z.array(roundSchema),
  healspread: z.record(z.string(), z.record(z.string(), z.number())),
  classkills: z.record(z.string(), z.record(z.string(), z.number())),
  classdeaths: z.record(z.string(), z.record(z.string(), z.number())),
  classkillassists: z.record(z.string(), z.record(z.string(), z.number())),
  chat: z.array(z.object({ steamid: z.string(), name: z.string(), msg: z.string() })),
  info: infoSchema,
  killstreaks: z.array(z.object({ steamid: z.string(), streak: z.number(), time: z.number() })),
  success: z.literal(true),
})
