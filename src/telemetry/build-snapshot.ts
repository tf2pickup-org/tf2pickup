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
    collections.players.countDocuments(),
    collections.staticGameServers.countDocuments(),
    collections.games.countDocuments(),
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

  return {
    instanceId,
    version,
    queueConfig: environment.QUEUE_CONFIG,
    features: {
      'games.skill_suggestions': skillSuggestions,
      'games.skill_step': skillStep,
      'games.logs_tf_upload_method': logsTfUploadMethod,
      'games.hide_server_info_from_spectators': hideServerInfo,
      'games.voice_server_type': voiceServerType,
      'games.auto_force_end_threshold': autoForceEndThreshold,
      'players.etf2l_account_required': etf2lAccountRequired,
      'players.minimum_in_game_hours': minimumInGameHours,
      'queue.player_skill_threshold': playerSkillThreshold,
      'queue.require_player_verification': requirePlayerVerification,
      'queue.map_cooldown': mapCooldown,
      'serveme_tf.preferred_region': servemePreferredRegion,
      'announcements.active': activeAnnouncements > 0,
      'players.registered_bucket': registeredPlayersBucket(registeredPlayers),
      'documents.customized': documentsCustomized,
      'games.cooldown_levels.customized': !isEqual(
        cooldownLevels,
        configuration.getDefault('games.cooldown_levels'),
      ),
      'games.default_player_skill.customized': !isEqual(
        defaultPlayerSkill,
        configuration.getDefault('games.default_player_skill'),
      ),
      'games.execute_extra_commands.set': extraCommands.length > 0,
    },
    integrations: {
      discord: Boolean(environment.DISCORD_BOT_TOKEN),
      serveme: Boolean(environment.SERVEME_TF_API_KEY),
      tf2QuickServer: Boolean(
        environment.TF2_QUICK_SERVER_CLIENT_ID && environment.TF2_QUICK_SERVER_CLIENT_SECRET,
      ),
      twitch: Boolean(environment.TWITCH_CLIENT_ID && environment.TWITCH_CLIENT_SECRET),
      logsTf: Boolean(environment.LOGS_TF_API_KEY),
      umami: Boolean(environment.UMAMI_WEBSITE_ID),
    },
    usage: {
      skillSuggestionsApplied30d: usage.skillSuggestionsApplied30d,
      adminSkillChanges30d: usage.adminSkillChanges30d,
      gamesLaunchedLifetime,
      staticGameServers,
    },
    maps,
    mapPool: pool.map(entry => entry.name).slice(0, maxMapPoolReported),
  }
}
