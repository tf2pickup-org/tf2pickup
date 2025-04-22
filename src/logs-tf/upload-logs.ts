import { z, ZodError } from 'zod'
import { environment } from '../environment'
import { logger } from '../logger'
import { version } from '../version'
import FormData from 'form-data'

const uploadLogResponseSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    log_id: z.string(),
    url: z.string(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
])

interface UploadLogsParams {
  mapName: string
  gameNumber: number
  logFile: string
  title?: string
}

const logsTfUrl = 'https://logs.tf'
const logsTfUploadEndpointUrl = `${logsTfUrl}/upload`

export async function uploadLogs(params: UploadLogsParams): Promise<string> {
  if (!environment.LOGS_TF_API_KEY) {
    throw new Error('LOGS_TF_API_KEY is not set')
  }

  const data = new FormData()
  const title = params.title ?? `${environment.WEBSITE_NAME} #${params.gameNumber}`
  data.append('title', title)
  data.append('map', params.mapName)
  data.append('key', environment.LOGS_TF_API_KEY)
  data.append('uploader', `tf2pickup.org ${version}`)
  data.append('logfile', Buffer.from(params.logFile, 'utf-8'), `${params.gameNumber}.log`)

  return new Promise((resolve, reject) => {
    data.submit(logsTfUploadEndpointUrl, (error, response) => {
      if (error) {
        reject(error)
        return
      }

      let reply = ''
      response.on('data', (chunk: string) => (reply += chunk))
      response.on('end', () => {
        try {
          const d = uploadLogResponseSchema.parse(JSON.parse(reply))
          if (!d.success) {
            reject(new Error(d.error))
          } else {
            resolve(`${logsTfUrl}${d.url}`)
          }
        } catch (error) {
          if (error instanceof ZodError) {
            logger.error({ logsTfResponse: reply, error }, 'failed to parse logs.tf response')
          }
          reject(error instanceof Error ? error : new Error(error as string))
        }
      })
      response.on('error', error => {
        reject(error)
      })

      response.resume()
    })
  })
}
