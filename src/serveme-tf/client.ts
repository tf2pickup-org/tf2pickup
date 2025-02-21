import { Client } from '@tf2pickup-org/serveme-tf-client'
import { environment } from '../environment'
import { logger } from '../logger'

export const client = initializeClient()

function initializeClient(): Client | null {
  if (environment.SERVEME_TF_API_KEY) {
    logger.info(
      { servemeTfApiEndpoint: environment.SERVEME_TF_API_ENDPOINT },
      'serveme.tf integration enabled',
    )
    return new Client({
      endpoint: environment.SERVEME_TF_API_ENDPOINT,
      apiKey: environment.SERVEME_TF_API_KEY,
    })
  } else {
    logger.info('serveme.tf integration disabled')
    return null
  }
}
