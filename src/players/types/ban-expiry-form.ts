import type { z } from 'zod'
import type { banExpiryFormSchema } from '../schemas/ban-expiry-form.schema'

export type BanExpiryForm = z.infer<typeof banExpiryFormSchema>
