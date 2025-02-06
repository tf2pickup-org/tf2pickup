import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { z } from 'zod'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { LogsTfUploadMethod } from '../../shared/types/logs-tf-upload-method'
import { VoiceServerType } from '../../shared/types/voice-server-type'
import { steamId64 } from '../../shared/schemas/steam-id-64'

export const configurationSchema = z.discriminatedUnion('key', [
  z.object({
    key: z.literal('games.default_player_skill'),
    value: z
      .record(z.nativeEnum(Tf2ClassName), z.number())
      .default(() =>
        Object.fromEntries(Object.values(Tf2ClassName).map(className => [className, 1])),
      ),
  }),
  z.object({
    key: z.literal('games.whitelist_id'),
    value: z.string().nullable().default(null),
  }),
  z
    .object({
      key: z.literal('games.join_gameserver_timeout'),
      value: z.number().default(minutesToMilliseconds(5)),
    })
    .describe('Time a player has to connect after the gameserver is configured (milliseconds)'),
  z
    .object({
      key: z.literal('games.rejoin_gameserver_timeout'),
      value: z.number().default(minutesToMilliseconds(3)),
    })
    .describe('Time a player has to join the gameserver when they leave it during the game'),
  z
    .object({
      key: z.literal('games.execute_extra_commands'),
      value: z.array(z.string()).default([]),
    })
    .describe('Execute extra commands via rcon upon configuring the game'),
  z
    .object({
      key: z.literal('games.logs_tf_upload_method'),
      value: z.nativeEnum(LogsTfUploadMethod).default(LogsTfUploadMethod.backend),
    })
    .describe('Method of uploading logs to the logs.tf service'),
  z.object({
    key: z.literal('games.voice_server_type'),
    value: z.nativeEnum(VoiceServerType).default(VoiceServerType.none),
  }),
  z.object({
    key: z.literal('games.voice_server.static_link'),
    value: z.string().url().nullable().default(null),
  }),
  z.object({
    key: z.literal('games.voice_server.mumble.url'),
    value: z.string().nullable().default(null),
  }),
  z.object({
    key: z.literal('games.voice_server.mumble.port'),
    value: z.number().gte(0).lte(65535).default(64738),
  }),
  z.object({
    key: z.literal('games.voice_server.mumble.channel_name'),
    value: z.string().nullable().default(null),
  }),
  z.object({
    key: z.literal('games.voice_server.mumble.password'),
    value: z.string().nullable().default(null),
  }),
  z.object({
    key: z.literal('games.join_queue_cooldown'),
    value: z
      .record(z.nativeEnum(Tf2ClassName), z.number())
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
  }),
  z.object({
    key: z.literal('games.auto_force_end_threshold'),
    value: z
      .number()
      .default(4)
      .describe(
        'Number of active substitute requests that make the game be automatically force-ended',
      ),
  }),
  z.object({
    key: z.literal('players.etf2l_account_required'),
    value: z.boolean().default(false),
  }),
  z.object({
    key: z.literal('players.minimum_in_game_hours'),
    value: z.number().default(0),
  }),
  z.object({
    key: z.literal('players.bypass_registration_restrictions'),
    value: z.array(steamId64).default([]),
  }),
  z.object({
    key: z.literal('queue.player_skill_threshold'),
    value: z.number().nullable().default(null),
  }),
  z
    .object({
      key: z.literal('queue.ready_up_timeout'),
      value: z.number().default(secondsToMilliseconds(40)),
    })
    .describe('Time players have to ready up before they are kicked out of the queue'),
  z
    .object({
      key: z.literal('queue.ready_state_timeout'),
      value: z.number().default(secondsToMilliseconds(60)),
    })
    .describe(
      'Time the queue stays in the ready-up state before going back to the waiting state, unless all players ready up',
    ),
  z
    .object({
      key: z.literal('queue.map_cooldown'),
      value: z.number().positive().default(2),
    })
    .describe('How many times the last played map cannot be an option to vote for'),
  z.object({
    key: z.literal('queue.deny_players_with_no_skill_assigned'),
    value: z.boolean().default(false),
  }),
  z.object({
    key: z.literal('queue.pre_ready_up_timeout'),
    value: z.number().positive().default(minutesToMilliseconds(5)),
  }),
  z.object({
    key: z.literal('serveme_tf.preferred_region'),
    value: z.string().nullable().default(null),
  }),
  z.object({
    key: z.literal('serveme_tf.ban_gameservers'),
    value: z.array(z.string()).default([]),
  }),
  z.object({
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
  }),
])

export type ConfigurationEntryModel = z.infer<typeof configurationSchema>

export type Configuration = {
  [key in ConfigurationEntryModel['key']]: Extract<ConfigurationEntryModel, { key: key }>['value']
}
