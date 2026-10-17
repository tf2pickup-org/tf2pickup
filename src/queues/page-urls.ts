import { listEnabled } from './list-enabled'
import { queuePageUrl } from './queue-page-url'

// Every queue page a client can be on, for broadcasts all of them share (chat, online players…).
export async function pageUrls(): Promise<string[]> {
  return (await listEnabled()).map(({ slug }) => queuePageUrl(slug))
}
