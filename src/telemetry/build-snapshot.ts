import { isEqual } from 'es-toolkit'
import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { mapPool } from '../maps/pool'
import { getPlayedMapsCount } from '../statistics/get-played-maps-count'
import { version } from '../version'
import { getUsageCounters } from './get-usage-counters'
import { instanceId } from './instance-id'
import { isDocumentsCustomized } from './is-documents-customized'

const maxMapsReported = 25
const maxMapPoolReported = 60

function registeredPlayersBucket(count: number): string {
  if (count < 50) return '<50'
  if (count < 200) return '50-199'
  if (count < 500) return '200-499'
  return '500+'
}

/**
 * Builds the anonymous telemetry snapshot for this instance: allow-listed,
 * non-PII configuration values, derived state, usage counters and the maps in
 * play. Never includes player data, server names, URLs, tokens or other
 * identifying fields.
 */
export async function buildSnapshot() {
  const [
    skillSuggestions,
    skillStep,
    logsTfUploadMethod,
    hideServerInfo,
    voiceServerType,
    autoForceEndThreshold,
    etf2lAccountRequired,
    minimumInGameHours,
    playerSkillThreshold,
    requirePlayerVerification,
    mapCooldown,
    servemePreferredRegion,
    cooldownLevels,
    defaultPlayerSkill,
    extraCommands,
  ] = await Promise.all([
    configuration.get('games.skill_suggestions'),
    configuration.get('games.skill_step'),
    configuration.get('games.logs_tf_upload_method'),
    configuration.get('games.hide_server_info_from_spectators'),
    configuration.get('games.voice_server_type'),
    configuration.get('games.auto_force_end_threshold'),
    configuration.get('players.etf2l_account_required'),
    configuration.get('players.minimum_in_game_hours'),
    configuration.get('queue.player_skill_threshold'),
    configuration.get('queue.require_player_verification'),
    configuration.get('queue.map_cooldown'),
    configuration.get('serveme_tf.preferred_region'),
    configuration.get('games.cooldown_levels'),
    configuration.get('games.default_player_skill'),
    configuration.get('games.execute_extra_commands'),
  ])

  const [
    activeAnnouncements,
    registeredPlayers,
    staticGameServers,
    gamesLaunchedLifetime,
    documentsCustomized,
    usage,
    playedMaps,
    pool,
  ] = await Promise.all([
    collections.announcements.countDocuments({ enabled: true }),
    collections.players.estimatedDocumentCount(),
    collections.staticGameServers.countDocuments({ isOnline: true }),
    collections.games.estimatedDocumentCount(),
    isDocumentsCustomized(),
    getUsageCounters(),
    getPlayedMapsCount(),
    mapPool.get(),
  ])

  const maps = Object.fromEntries(
    playedMaps
      .filter(({ mapName }) => Boolean(mapName))
      .slice(0, maxMapsReported)
      .map(({ mapName, count }) => [mapName, count]),
  )

  const featureEntries = [
    {
      key: 'games.skill_suggestions',
      value: skillSuggestions,
      label: 'Skill suggestions',
      group: 'Games',
    },
    { key: 'games.skill_step', value: skillStep, label: 'Skill adjustment step', group: 'Games' },
    {
      key: 'games.logs_tf_upload_method',
      value: logsTfUploadMethod,
      label: 'logs.tf upload method',
      group: 'Games',
    },
    {
      key: 'games.hide_server_info_from_spectators',
      value: hideServerInfo,
      label: 'Hide server info from spectators',
      group: 'Games',
    },
    {
      key: 'games.voice_server_type',
      value: voiceServerType,
      label: 'Voice server',
      group: 'Games',
    },
    {
      key: 'games.auto_force_end_threshold',
      value: autoForceEndThreshold,
      label: 'Auto force-end threshold',
      group: 'Games',
    },
    {
      key: 'players.etf2l_account_required',
      value: etf2lAccountRequired,
      label: 'ETF2L account required',
      group: 'Players',
    },
    {
      key: 'players.minimum_in_game_hours',
      value: minimumInGameHours,
      label: 'Minimum in-game hours',
      group: 'Players',
    },
    {
      key: 'queue.player_skill_threshold',
      value: playerSkillThreshold,
      label: 'Queue skill threshold',
      group: 'Queue',
    },
    {
      key: 'queue.require_player_verification',
      value: requirePlayerVerification,
      label: 'Require player verification',
      group: 'Queue',
    },
    { key: 'queue.map_cooldown', value: mapCooldown, label: 'Map cooldown', group: 'Queue' },
    {
      key: 'serveme_tf.preferred_region',
      value: servemePreferredRegion,
      label: 'serveme.tf preferred region',
      group: 'Integrations',
    },
    {
      key: 'announcements.active',
      value: activeAnnouncements > 0,
      label: 'Active announcement',
      group: 'State',
    },
    {
      key: 'players.registered_bucket',
      value: registeredPlayersBucket(registeredPlayers),
      label: 'Registered players',
      group: 'State',
    },
    {
      key: 'documents.customized',
      value: documentsCustomized,
      label: 'Custom rules / privacy policy',
      group: 'Customization',
    },
    {
      key: 'games.cooldown_levels.customized',
      value: !isEqual(cooldownLevels, configuration.getDefault('games.cooldown_levels')),
      label: 'Custom cooldown levels',
      group: 'Customization',
    },
    {
      key: 'games.default_player_skill.customized',
      value: !isEqual(defaultPlayerSkill, configuration.getDefault('games.default_player_skill')),
      label: 'Custom default skill',
      group: 'Customization',
    },
    {
      key: 'games.execute_extra_commands.set',
      value: extraCommands.length > 0,
      label: 'Extra rcon commands',
      group: 'Customization',
    },
  ]

  const integrationEntries = [
    { key: 'discord', value: Boolean(environment.DISCORD_BOT_TOKEN), label: 'Discord' },
    { key: 'serveme', value: Boolean(environment.SERVEME_TF_API_KEY), label: 'serveme.tf' },
    {
      key: 'tf2QuickServer',
      value: Boolean(
        environment.TF2_QUICK_SERVER_CLIENT_ID && environment.TF2_QUICK_SERVER_CLIENT_SECRET,
      ),
      label: 'TF2 Quick Server',
    },
    {
      key: 'twitch',
      value: Boolean(environment.TWITCH_CLIENT_ID && environment.TWITCH_CLIENT_SECRET),
      label: 'Twitch',
    },
    { key: 'logsTf', value: Boolean(environment.LOGS_TF_API_KEY), label: 'logs.tf' },
    { key: 'umami', value: Boolean(environment.UMAMI_WEBSITE_ID), label: 'Umami analytics' },
  ]

  const usageEntries = [
    {
      key: 'skillSuggestionsApplied30d',
      value: usage.skillSuggestionsApplied30d,
      label: 'Skill suggestions applied (30d)',
    },
    {
      key: 'adminSkillChanges30d',
      value: usage.adminSkillChanges30d,
      label: 'Admin skill changes (30d)',
    },
    {
      key: 'eloPageRenders30d',
      value: usage.eloPageRenders30d,
      label: 'ELO page renders (30d)',
    },
    {
      key: 'gameReinitializations30d',
      value: usage.gameReinitializations30d,
      label: 'Game reinitializations (30d)',
    },
    {
      key: 'gameReinitializationsPerGame',
      value: usage.gameReinitializationsPerGame,
      label: 'Game reinitializations per game (30d)',
    },
    {
      key: 'gameServerReassignments30d',
      value: usage.gameServerReassignments30d,
      label: 'Game server reassignments (30d)',
    },
    {
      key: 'gameServerReassignmentsPerGame',
      value: usage.gameServerReassignmentsPerGame,
      label: 'Game server reassignments per game (30d)',
    },
    {
      key: 'gamesForceEnded30d',
      value: usage.gamesForceEnded30d,
      label: 'Games force-ended (30d)',
    },
    {
      key: 'gamesForceEndedShare',
      value: usage.gamesForceEndedShare,
      label: 'Games force-ended share (30d)',
    },
    {
      key: 'gamesLaunchedLifetime',
      value: gamesLaunchedLifetime,
      label: 'Games launched (lifetime)',
    },
    { key: 'staticGameServers', value: staticGameServers, label: 'Static game servers' },
  ]

  return {
    instanceId,
    version,
    queueConfig: environment.QUEUE_CONFIG,
    features: Object.fromEntries(featureEntries.map(({ key, value }) => [key, value])),
    integrations: Object.fromEntries(integrationEntries.map(({ key, value }) => [key, value])),
    usage: Object.fromEntries(usageEntries.map(({ key, value }) => [key, value])),
    maps,
    mapPool: pool.map(entry => entry.name).slice(0, maxMapPoolReported),
    meta: {
      features: featureEntries.map(({ key, label, group }) => ({ key, label, group })),
      integrations: integrationEntries.map(({ key, label }) => ({ key, label })),
      usage: usageEntries.map(({ key, label }) => ({ key, label })),
    },
  }
}
