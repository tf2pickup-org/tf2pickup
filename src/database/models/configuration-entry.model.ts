import { milliseconds, minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { z } from 'zod'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Gamemode } from '../../shared/types/gamemode'
import { LogsTfUploadMethod } from '../../shared/types/logs-tf-upload-method'
import { VoiceServerType } from '../../shared/types/voice-server-type'
import { HideServerInfoMode } from '../../shared/types/hide-server-info-mode'
import { steamId64 } from '../../shared/schemas/steam-id-64'

// Where each setting can be edited outside View for nerds
export const settingPages = z.registry<{ page: string }>()

export const configurationSchema = z.discriminatedUnion('key', [
  z
    .object({
      key: z.literal('discord.guilds'),
      value: z
        .array(
          z.object({
            id: z.string(),
            substituteNotifications: z
              .object({
                channel: z.string(),
                role: z.string().optional(),
              })
              .optional(),
            queuePrompts: z
              .object({
                channel: z.string(),
                bumpPlayerThresholdRatio: z.number(),
              })
              .optional(),
            adminNotifications: z
              .object({
                channel: z.string(),
              })
              .optional(),
          }),
        )
        .default([]),
    })
    .register(settingPages, { page: '/admin/discord' }),
  z
    .object({
      key: z.literal('games.cooldown_levels'),
      value: z
        .array(
          z.object({
            level: z.number().min(0),
            banLengthMs: z.number().min(0),
          }),
        )
        .default([
          {
            level: 0,
            banLengthMs: milliseconds({ minutes: 30 }),
          },
          {
            level: 1,
            banLengthMs: milliseconds({ hours: 6 }),
          },
          {
            level: 2,
            banLengthMs: milliseconds({ hours: 24 }),
          },
          {
            level: 3,
            banLengthMs: milliseconds({ days: 2 }),
          },
          {
            level: 4,
            banLengthMs: milliseconds({ days: 7 }),
          },
          {
            level: 5,
            banLengthMs: milliseconds({ days: 14 }),
          },
          {
            level: 6,
            banLengthMs: milliseconds({ months: 1 }),
          },
          {
            level: 7,
            banLengthMs: milliseconds({ months: 2 }),
          },
          {
            level: 8,
            banLengthMs: milliseconds({ months: 6 }),
          },
          {
            level: 9,
            banLengthMs: milliseconds({ years: 1 }),
          },
        ]),
    })
    .register(settingPages, { page: '/admin/penalties' }),
  z
    .object({
      key: z.literal('games.cooldown_decay_period'),
      value: z
        .number()
        .min(0)
        .default(milliseconds({ months: 1 })),
    })
    .describe(
      'Time a player has to stay clean for their cooldown level to drop by one (milliseconds). Use 0 to never decay',
    )
    .register(settingPages, { page: '/admin/penalties' }),
  z
    .object({
      key: z.literal('games.default_player_skill'),
      value: z
        .partialRecord(z.enum(Gamemode), z.partialRecord(z.enum(Tf2ClassName), z.number()))
        .default(() =>
          Object.fromEntries(
            Object.values(Gamemode).map(gamemode => [
              gamemode,
              Object.fromEntries(Object.values(Tf2ClassName).map(className => [className, 1])),
            ]),
          ),
        ),
    })
    .register(settingPages, { page: '/admin/skill' }),
  z
    .object({
      key: z.literal('games.whitelist_id'),
      value: z.string().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/games' }),
  z
    .object({
      key: z.literal('games.join_gameserver_timeout'),
      value: z.number().min(0).default(minutesToMilliseconds(5)),
    })
    .describe('Time a player has to connect after the gameserver is configured (milliseconds)')
    .register(settingPages, { page: '/admin/match-rules' }),
  z
    .object({
      key: z.literal('games.rejoin_gameserver_timeout'),
      value: z.number().min(0).default(minutesToMilliseconds(3)),
    })
    .describe('Time a player has to join the gameserver when they leave it during the game')
    .register(settingPages, { page: '/admin/match-rules' }),
  z
    .object({
      key: z.literal('games.execute_extra_commands'),
      value: z.array(z.string()).default([]),
    })
    .describe('Execute extra commands via rcon upon configuring the game')
    .register(settingPages, { page: '/admin/games' }),
  z
    .object({
      key: z.literal('games.logs_tf_upload_method'),
      value: z.enum(LogsTfUploadMethod).default(LogsTfUploadMethod.backend),
    })
    .describe('Method of uploading logs to the logs.tf service')
    .register(settingPages, { page: '/admin/games' }),
  z
    .object({
      key: z.literal('games.hide_server_info_from_spectators'),
      value: z.enum(HideServerInfoMode).default(HideServerInfoMode.auto),
    })
    .describe(
      'Hide the game server connect info (incl. SourceTV) from non-participants to mitigate DDoS. "auto" only hides it for non-serveme.tf servers, which have built-in DDoS protection.',
    )
    .register(settingPages, { page: '/admin/game-servers' }),
  z
    .object({
      key: z.literal('games.voice_server_type'),
      value: z.enum(VoiceServerType).default(VoiceServerType.none),
    })
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.static_link'),
      value: z.url().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.mumble.url'),
      value: z.string().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.mumble.internal_url'),
      value: z.string().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.mumble.port'),
      value: z.number().gte(0).lte(65535).default(64738),
    })
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.mumble.channel_name'),
      value: z.string().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.mumble.password'),
      value: z.string().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.mumble.username'),
      value: z.string().min(1).default('tf2pickup.org bot'),
    })
    .describe('Name of the bot user that connects to the mumble server')
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.voice_server.mumble.player_verification'),
      value: z.boolean().default(false),
    })
    .describe("Verify players by their Mumble certificate and only let a game's players in")
    .register(settingPages, { page: '/admin/voice-server' }),
  z
    .object({
      key: z.literal('games.join_queue_cooldown'),
      value: z
        .record(z.enum(Tf2ClassName), z.number().min(0))
        .default({
          [Tf2ClassName.scout]: secondsToMilliseconds(5),
          [Tf2ClassName.soldier]: secondsToMilliseconds(5),
          [Tf2ClassName.pyro]: secondsToMilliseconds(5),
          [Tf2ClassName.demoman]: secondsToMilliseconds(5),
          [Tf2ClassName.heavy]: secondsToMilliseconds(5),
          [Tf2ClassName.engineer]: secondsToMilliseconds(5),
          [Tf2ClassName.medic]: secondsToMilliseconds(0),
          [Tf2ClassName.sniper]: secondsToMilliseconds(5),
          [Tf2ClassName.spy]: secondsToMilliseconds(5),
        })
        .describe('Apply cooldown before players can join the queue after a game ends'),
    })
    .register(settingPages, { page: '/admin/penalties' }),
  z
    .object({
      key: z.literal('games.auto_force_end_threshold'),
      value: z
        .number()
        .int()
        .min(0)
        .default(4)
        .describe(
          'Number of active substitute requests that make the game be automatically force-ended',
        ),
    })
    .register(settingPages, { page: '/admin/match-rules' }),
  z
    .object({
      key: z.literal('games.skill_step'),
      value: z.number().positive().default(1.0),
    })
    .describe('Increment/decrement step when adjusting player skill in the admin panel')
    .register(settingPages, { page: '/admin/skill' }),
  z
    .object({
      key: z.literal('games.skill_suggestions'),
      value: z.boolean().default(true),
    })
    .describe(
      'Experimental: show skill adjustment suggestions in the admin toolbox based on player performance',
    )
    .register(settingPages, { page: '/admin/skill' }),
  z
    .object({
      key: z.literal('misc.discord_invite_link'),
      value: z.url().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/discord' }),
  z
    .object({
      key: z.literal('players.etf2l_account_required'),
      value: z.boolean().default(false),
    })
    .register(settingPages, { page: '/admin/registration' }),
  z
    .object({
      key: z.literal('players.etf2l_ban_sync'),
      value: z.boolean().default(false),
    })
    .register(settingPages, { page: '/admin/registration' }),
  z
    .object({
      key: z.literal('players.etf2l_ban_sync_reasons'),
      value: z
        .array(z.string())
        .default([
          'cheating',
          'aimbot',
          'triggerbot',
          'wallhack',
          'alting',
          'banned game modifications',
          'game ban',
        ]),
    })
    .describe('Mirror only ETF2L.org bans whose reason contains one of these (case-insensitive)')
    .register(settingPages, { page: '/admin/registration' }),
  z
    .object({
      key: z.literal('players.minimum_in_game_hours'),
      value: z.number().min(0).default(0),
    })
    .register(settingPages, { page: '/admin/registration' }),
  z
    .object({
      key: z.literal('players.bypass_registration_restrictions'),
      value: z.array(steamId64).default([]),
    })
    .register(settingPages, { page: '/admin/registration' }),
  z
    .object({
      key: z.literal('queue.pre_ready_up_timeout'),
      value: z.number().positive().default(minutesToMilliseconds(5)),
    })
    .register(settingPages, { page: '/admin/queues' }),
  z
    .object({
      key: z.literal('serveme_tf.preferred_region'),
      value: z.string().nullable().default(null),
    })
    .register(settingPages, { page: '/admin/game-servers' }),
  z
    .object({
      key: z.literal('serveme_tf.ban_gameservers'),
      value: z.array(z.string()).default([]),
    })
    .register(settingPages, { page: '/admin/game-servers' }),
  z
    .object({
      key: z.literal('serveme_tf.preferred_gameserver'),
      value: z.string().min(1).nullable().default(null),
    })
    .describe(
      'Name of the gameserver to always pick when reserving a serveme.tf server, if available',
    )
    .register(settingPages, { page: '/admin/game-servers' }),
  z
    .object({
      key: z.literal('tf2_quick_server.region'),
      value: z.string().default('sa-saopaulo-1'),
    })
    .register(settingPages, { page: '/admin/game-servers' }),
  z
    .object({
      key: z.literal('tf2_quick_server.timeout'),
      value: z.number().default(minutesToMilliseconds(5)),
    })
    .describe('TF2 Quick Server creation timeout')
    .register(settingPages, { page: '/admin/game-servers' }),
  z
    .object({
      key: z.literal('twitchtv.promoted_streams'),
      value: z
        .array(z.string())
        .default([
          'teamfortresstv',
          'teamfortresstv2',
          'teamfortresstv3',
          'kritzkast',
          'kritzkast2',
          'rglgg',
          'essentialstf',
          'cappingtv',
          'cappingtv2',
          'cappingtv3',
          'tflivetv',
        ]),
    })
    .register(settingPages, { page: '/admin/streams' }),
])

export type ConfigurationEntryModel = z.infer<typeof configurationSchema>

export type Configuration = {
  [key in ConfigurationEntryModel['key']]: Extract<ConfigurationEntryModel, { key: key }>['value']
}
