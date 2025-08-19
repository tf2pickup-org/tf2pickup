import { z } from 'zod'
import dotenv from 'dotenv'
import { KnownEndpoint } from '@tf2pickup-org/serveme-tf-client'
import { steamId64 } from './shared/schemas/steam-id-64'

dotenv.config()

const environmentSchema = z.object({
  NODE_ENV: z.string().default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  APP_HOST: z.string().default('localhost'),
  APP_PORT: z.coerce.number().default(3000),

  ENABLE_TEST_AUTH: z.enum(['true', 'false']).default('false'),

  WEBSITE_URL: z.url(),
  WEBSITE_NAME: z.string().default('tf2pickup.org'),
  WEBSITE_BRANDING: z.string().optional(),
  MONGODB_URI: z.url(),
  SUPER_USER: steamId64.optional(),
  STEAM_API_KEY: z.string(),
  QUEUE_CONFIG: z.enum(['test', '6v6', '9v9', 'bball', 'ultiduo']).default('6v6'),
  KEY_STORE_PASSPHRASE: z.string(),
  LOG_RELAY_ADDRESS: z.string(),
  LOG_RELAY_PORT: z.coerce.number(),
  LOGS_TF_API_KEY: z.string().optional(),
  GAME_SERVER_SECRET: z.string(),
  THUMBNAIL_SERVICE_URL: z.url(),

  SERVEME_TF_API_ENDPOINT: z.string().default(KnownEndpoint.europe),
  SERVEME_TF_API_KEY: z.string().optional(),

  DISCORD_BOT_TOKEN: z.string().optional(),

  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),

  UMAMI_SCRIPT_SRC: z.string().optional(),
  UMAMI_WEBSITE_ID: z.string().optional(),
})

export const environment = environmentSchema.parse(process.env)
