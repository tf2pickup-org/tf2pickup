import type { z } from 'zod'
import { environment } from '../environment'
import { ServemeTfApiError } from './errors/serveme-tf-api.error'

interface ServemeTfApiRequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: object
}

// Sends an authenticated request to the serveme.tf API and validates the response against `schema`.
// `path` may be relative (resolved against the configured endpoint) or an absolute URL returned by
// the API itself (e.g. the find_servers action).
export async function servemeTfApiRequest<Schema extends z.ZodType>(
  schema: Schema,
  path: string,
  options: ServemeTfApiRequestOptions = {},
): Promise<z.infer<Schema>> {
  if (environment.SERVEME_TF_API_KEY === undefined) {
    throw new Error('serveme.tf integration is disabled')
  }

  const url = new URL(
    path.startsWith('http') ? path : `https://${environment.SERVEME_TF_API_ENDPOINT}/api/${path}`,
  )
  url.searchParams.set('api_key', environment.SERVEME_TF_API_KEY)

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  if (!response.ok) {
    const detail = `${response.status} ${response.statusText}: ${await response.text()}`
    throw new ServemeTfApiError(url.toString(), response, detail)
  }

  return schema.parseAsync(await response.json())
}
