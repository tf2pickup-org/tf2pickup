import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSnapshot } from './build-snapshot'
import { configuration } from '../configuration'

vi.mock('../environment', () => ({
  environment: {
    QUEUE_CONFIG: '6v6',
    DISCORD_BOT_TOKEN: 'token',
    SERVEME_TF_API_KEY: undefined,
    TF2_QUICK_SERVER_CLIENT_ID: 'id',
    TF2_QUICK_SERVER_CLIENT_SECRET: 'secret',
    TWITCH_CLIENT_ID: undefined,
    TWITCH_CLIENT_SECRET: undefined,
    LOGS_TF_API_KEY: 'logs',
    UMAMI_WEBSITE_ID: undefined,
  },
}))

vi.mock('../version', () => ({ version: '1.2.3' }))

vi.mock('./instance-id', () => ({ instanceId: 'deadbeef' }))

vi.mock('../configuration', () => ({
  configuration: { get: vi.fn(), getDefault: vi.fn() },
}))

vi.mock('../database/collections', () => ({
  collections: {
    announcements: { countDocuments: vi.fn().mockResolvedValue(1) },
    players: { estimatedDocumentCount: vi.fn().mockResolvedValue(120) },
    staticGameServers: { countDocuments: vi.fn().mockResolvedValue(3) },
    games: { estimatedDocumentCount: vi.fn().mockResolvedValue(5000) },
  },
}))

vi.mock('../maps/pool', () => ({
  mapPool: {
    get: vi.fn().mockResolvedValue([{ name: 'cp_process_f12' }, { name: 'cp_gullywash_f9' }]),
  },
}))

vi.mock('../statistics/get-played-maps-count', () => ({
  getPlayedMapsCount: vi.fn().mockResolvedValue([
    { mapName: 'process', count: 120 },
    { mapName: 'gullywash', count: 80 },
    { mapName: undefined, count: 5 },
  ]),
}))

vi.mock('./get-usage-counters', () => ({
  getUsageCounters: vi.fn().mockResolvedValue({
    skillSuggestionsApplied30d: 12,
    adminSkillChanges30d: 30,
    eloPageRenders30d: 7,
    gameReinitializations30d: 4,
    gameReinitializationsPerGame: 0.02,
    gameServerReassignments30d: 2,
    gameServerReassignmentsPerGame: 0.01,
  }),
}))

vi.mock('./is-documents-customized', () => ({
  isDocumentsCustomized: vi.fn().mockResolvedValue(true),
}))

const values: Record<string, unknown> = {
  'games.skill_suggestions': true,
  'games.skill_step': 1,
  'games.logs_tf_upload_method': 'backend',
  'games.hide_server_info_from_spectators': 'auto',
  'games.voice_server_type': 'mumble',
  'games.auto_force_end_threshold': 4,
  'players.etf2l_account_required': false,
  'players.minimum_in_game_hours': 0,
  'queue.player_skill_threshold': null,
  'queue.require_player_verification': false,
  'queue.map_cooldown': 2,
  'serveme_tf.preferred_region': 'eu',
  'games.cooldown_levels': [{ level: 0, banLengthMs: 1 }],
  'games.default_player_skill': { soldier: 5 },
  'games.execute_extra_commands': [],
}

const defaults: Record<string, unknown> = {
  'games.cooldown_levels': [{ level: 0, banLengthMs: 1 }],
  'games.default_player_skill': { soldier: 1 },
}

vi.mocked(configuration.get).mockImplementation((key: string) =>
  Promise.resolve(values[key] as never),
)
vi.mocked(configuration.getDefault).mockImplementation((key: string) => defaults[key] as never)

afterEach(() => vi.clearAllMocks())

describe('buildSnapshot', () => {
  it('includes anonymous identity and version', async () => {
    const snapshot = await buildSnapshot()
    expect(snapshot.instanceId).toBe('deadbeef')
    expect(snapshot.version).toBe('1.2.3')
    expect(snapshot.queueConfig).toBe('6v6')
  })

  it('reports allow-listed configuration values', async () => {
    const snapshot = await buildSnapshot()
    expect(snapshot.features['games.skill_suggestions']).toBe(true)
    expect(snapshot.features['games.voice_server_type']).toBe('mumble')
    expect(snapshot.features['queue.player_skill_threshold']).toBeNull()
    expect(snapshot.features['serveme_tf.preferred_region']).toBe('eu')
  })

  it('derives integration flags from env presence', async () => {
    const snapshot = await buildSnapshot()
    expect(snapshot.integrations).toEqual({
      discord: true,
      serveme: false,
      tf2QuickServer: true,
      twitch: false,
      logsTf: true,
      umami: false,
    })
  })

  it('derives state and customization signals', async () => {
    const snapshot = await buildSnapshot()
    expect(snapshot.features['announcements.active']).toBe(true)
    expect(snapshot.features['players.registered_bucket']).toBe('50-199')
    expect(snapshot.features['documents.customized']).toBe(true)
    expect(snapshot.features['games.cooldown_levels.customized']).toBe(false)
    expect(snapshot.features['games.default_player_skill.customized']).toBe(true)
    expect(snapshot.features['games.execute_extra_commands.set']).toBe(false)
  })

  it('reports usage counters', async () => {
    const snapshot = await buildSnapshot()
    expect(snapshot.usage).toEqual({
      skillSuggestionsApplied30d: 12,
      adminSkillChanges30d: 30,
      eloPageRenders30d: 7,
      gameReinitializations30d: 4,
      gameReinitializationsPerGame: 0.02,
      gameServerReassignments30d: 2,
      gameServerReassignmentsPerGame: 0.01,
      gamesLaunchedLifetime: 5000,
      staticGameServers: 3,
    })
  })

  it('reports played maps and the configured pool, dropping blank map names', async () => {
    const snapshot = await buildSnapshot()
    expect(snapshot.maps).toEqual({ process: 120, gullywash: 80 })
    expect(snapshot.mapPool).toEqual(['cp_process_f12', 'cp_gullywash_f9'])
  })

  it('ships display metadata for every reported key', async () => {
    const snapshot = await buildSnapshot()
    expect(snapshot.meta.features).toContainEqual({
      key: 'games.skill_suggestions',
      label: 'Skill suggestions',
      group: 'Games',
    })
    expect(snapshot.meta.integrations).toContainEqual({ key: 'discord', label: 'Discord' })
    expect(snapshot.meta.usage).toContainEqual({
      key: 'skillSuggestionsApplied30d',
      label: 'Skill suggestions applied (30d)',
    })
    expect(snapshot.meta.features.map(entry => entry.key)).toEqual(Object.keys(snapshot.features))
  })
})
