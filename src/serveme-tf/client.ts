import { Client } from '@tf2pickup-org/serveme-tf-client'
import { configuration } from '../configuration'

export async function getClient(): Promise<Client | null> {
  const [enabled, endpoint, apiKey] = await Promise.all([
    configuration.get('serveme_tf.enabled'),
    configuration.get('serveme_tf.api_endpoint'),
    configuration.get('serveme_tf.api_key'),
  ])

  if (!enabled || !apiKey) {
    return null
  }

  return new Client({ endpoint, apiKey })
}

export async function isEnabled(): Promise<boolean> {
  return (await getClient()) !== null
}
