import { z } from 'zod'
import { environment } from '../environment'
import { logger } from '../logger'
import { errors } from '../errors'

const baseUrl = 'https://tf2-quickserver.sonikro.com'
const tokenUrl = 'https://tf2-quickserver.us.auth0.com/oauth/token'
const audience = 'https://tf2-quickserver.sonikro.com'

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
})

const resultServerSchema = z.object({
  serverId: z.string(),
  region: z.string(),
  variant: z.string(),
  hostIp: z.string(),
  hostPort: z.number(),
  tvIp: z.string(),
  tvPort: z.number(),
  rconPassword: z.string(),
  hostPassword: z.string(),
  rconAddress: z.string(),
  tvPassword: z.string(),
  logSecret: z.number(),
})

const serverSchema = z.discriminatedUnion('status', [
  z.object({
    ...resultServerSchema.shape,
    status: z.literal('pending'),
    hostIp: z.string().nullable(),
    hostPort: z.number().nullable(),
    tvIp: z.string().nullable(),
    tvPort: z.number().nullable(),
    rconPassword: z.string().nullable(),
    hostPassword: z.string().nullable(),
    rconAddress: z.string().nullable(),
    tvPassword: z.string().nullable(),
    logSecret: z.number().nullable(),
  }),
  z.object({
    ...resultServerSchema.shape,
    status: z.literal('ready'),
  }),
  z.object({
    ...resultServerSchema.shape,
    status: z.literal('terminating'),
  }),
])

const taskSchema = z.object({
  taskId: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: resultServerSchema.optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  ownerId: z.string(),
})

const taskAcceptedSchema = z.object({
  taskId: z.string(),
})

export type Tf2QuickServer = z.infer<typeof resultServerSchema>
export type Tf2QuickServerTask = z.infer<typeof taskSchema>

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: environment.TF2_QUICK_SERVER_CLIENT_ID,
      client_secret: environment.TF2_QUICK_SERVER_CLIENT_SECRET,
      audience,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    throw new Error(`failed to obtain TF2 QuickServer access token: ${response.statusText}`)
  }

  const { access_token, expires_in } = tokenResponseSchema.parse(await response.json())
  cachedToken = { value: access_token, expiresAt: now + expires_in * 1000 }
  return access_token
}

async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = await getAccessToken()
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw errors.internalServerError(
      `TF2 QuickServer API error ${response.status}: ${await response.text()}`,
    )
  }

  return response.json()
}

export async function listServers(): Promise<z.infer<typeof serverSchema>[]> {
  return z.array(serverSchema).parse(await apiFetch('/api/servers'))
}

export async function createServer(region: string): Promise<{ taskId: string }> {
  logger.info({ region }, 'creating TF2 QuickServer server')
  return taskAcceptedSchema.parse(
    await apiFetch('/api/servers', {
      method: 'POST',
      body: JSON.stringify({
        region,
        variantName: 'tf2pickup',
        extraEnvs: {
          SERVER_HOSTNAME: environment.WEBSITE_NAME,
        },
      }),
    }),
  )
}

export async function getTask(taskId: string): Promise<Tf2QuickServerTask> {
  return taskSchema.parse(await apiFetch(`/api/tasks/${taskId}`))
}

export async function deleteServer(serverId: string): Promise<{ taskId: string }> {
  return taskAcceptedSchema.parse(await apiFetch(`/api/servers/${serverId}`, { method: 'DELETE' }))
}
