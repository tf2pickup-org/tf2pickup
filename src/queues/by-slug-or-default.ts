import type { QueueModel } from '../database/models/queue.model'
import { bySlug } from './by-slug'
import { getDefault } from './get-default'

export async function bySlugOrDefault(slug: string | undefined): Promise<QueueModel> {
  return slug ? await bySlug(slug) : await getDefault()
}
