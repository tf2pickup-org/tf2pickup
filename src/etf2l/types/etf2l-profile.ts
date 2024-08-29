import type { z } from 'zod'
import type { etf2lProfileSchema } from '../schemas/etf2l-profile.schema'

export type Etf2lProfile = z.infer<typeof etf2lProfileSchema>
