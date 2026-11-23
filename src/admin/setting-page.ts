import type { Configuration } from '../database/models/configuration-entry.model'
import type { QueueConfiguration } from '../database/models/queue.model'

// Where each setting can be edited outside View for nerds; null when nowhere else.
const configurationPages: Record<keyof Configuration, string | null> = {
  'discord.guilds': '/admin/discord',
  'games.cooldown_levels': '/admin/penalties',
  'games.cooldown_decay_period': '/admin/penalties',
  'games.default_player_skill': '/admin/skill',
  'games.whitelist_id': '/admin/games',
  'games.join_gameserver_timeout': '/admin/match-rules',
  'games.rejoin_gameserver_timeout': '/admin/match-rules',
  'games.execute_extra_commands': '/admin/games',
  'games.logs_tf_upload_method': '/admin/games',
  'games.hide_server_info_from_spectators': '/admin/game-servers',
  'games.voice_server_type': '/admin/voice-server',
  'games.voice_server.static_link': '/admin/voice-server',
  'games.voice_server.mumble.url': '/admin/voice-server',
  'games.voice_server.mumble.internal_url': '/admin/voice-server',
  'games.voice_server.mumble.port': '/admin/voice-server',
  'games.voice_server.mumble.channel_name': '/admin/voice-server',
  'games.voice_server.mumble.password': '/admin/voice-server',
  'games.voice_server.mumble.username': '/admin/voice-server',
  'games.voice_server.mumble.player_verification': '/admin/voice-server',
  'games.join_queue_cooldown': '/admin/penalties',
  'games.auto_force_end_threshold': '/admin/match-rules',
  'games.skill_step': '/admin/skill',
  'games.skill_suggestions': '/admin/skill',
  'misc.discord_invite_link': '/admin/discord',
  'players.etf2l_account_required': '/admin/registration',
  'players.etf2l_ban_sync': '/admin/registration',
  'players.etf2l_ban_sync_reasons': '/admin/registration',
  'players.minimum_in_game_hours': '/admin/registration',
  'players.bypass_registration_restrictions': '/admin/registration',
  'queue.pre_ready_up_timeout': '/admin/queues',
  'serveme_tf.preferred_region': '/admin/game-servers',
  'serveme_tf.ban_gameservers': '/admin/game-servers',
  'serveme_tf.preferred_gameserver': '/admin/game-servers',
  'tf2_quick_server.region': '/admin/game-servers',
  'tf2_quick_server.timeout': '/admin/game-servers',
  'twitchtv.promoted_streams': '/admin/streams',
}

const queueTabs: Record<keyof QueueConfiguration, '' | '/timers' | null> = {
  name: '',
  skillThreshold: '',
  requireVerification: '',
  whitelistId: '',
  readyUpTimeout: '/timers',
  readyStateTimeout: '/timers',
  pickTimeout: '/timers',
  mapCooldown: null,
}

export function settingPage(
  setting:
    { configKey: keyof Configuration } | { queueSlug: string; field: keyof QueueConfiguration },
): string | null {
  if ('configKey' in setting) {
    return configurationPages[setting.configKey]
  }
  const tab = queueTabs[setting.field]
  return tab === null ? null : `/admin/queues/${setting.queueSlug}${tab}`
}
