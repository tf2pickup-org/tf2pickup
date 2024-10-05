import type { z } from 'zod'
import type { getStreamsResponseSchema } from '../schemas/get-streams-response.schema'

export type Stream = z.infer<typeof getStreamsResponseSchema>['data'][number]
