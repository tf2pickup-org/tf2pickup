import { environment } from '../environment'
import { logger } from '../logger'
import { version } from '../version'
import FormData from 'form-data'

interface UploadLogsResponse {
  success: boolean
  error?: string
  log_id: string
  url: string
}

interface UploadLogsParams {
  mapName: string
  gameNumber: number
  logFile: string
  title?: string
}

const logsTfUploadEndpointUrl = 'https://logs.tf/upload'

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
          const d = JSON.parse(reply) as UploadLogsResponse
          if (!d.success) {
            reject(new Error(d.error ?? 'unknown error'))
          } else {
            resolve(`https://logs.tf${d.url}`)
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            logger.error({ logsTfResponse: reply }, 'failed to parse logs.tf response')
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
