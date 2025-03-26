import { z } from 'zod'
import dotenv from 'dotenv'
import { KnownEndpoint } from '@tf2pickup-org/serveme-tf-client'

dotenv.config()

const environmentSchema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_HOST: z.string().default('localhost'),
  APP_PORT: z.coerce.number().default(3000),

  WEBSITE_URL: z.string().url(),
  WEBSITE_NAME: z.string().default('tf2pickup.org'),
  MONGODB_URI: z.string().url(),
  STEAM_API_KEY: z.string(),
  QUEUE_CONFIG: z.enum(['test', '6v6', '9v9', 'bball', 'ultiduo']).default('6v6'),
  KEY_STORE_PASSPHRASE: z.string(),
  LOG_RELAY_ADDRESS: z.string(),
  LOG_RELAY_PORT: z.coerce.number(),
  LOGS_TF_API_KEY: z.string().optional(),
  GAME_SERVER_SECRET: z.string(),
  THUMBNAIL_SERVICE_URL: z.string().url(),

  SERVEME_TF_API_ENDPOINT: z.string().default(KnownEndpoint.europe),
  SERVEME_TF_API_KEY: z.string().optional(),

  DISCORD_BOT_TOKEN: z.string().optional(),

  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),

  UMAMI_SCRIPT_SRC: z.string().optional(),
  UMAMI_WEBSITE_ID: z.string().optional(),
})

export const environment = environmentSchema.parse(process.env)
