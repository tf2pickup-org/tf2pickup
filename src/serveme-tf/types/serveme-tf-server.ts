import type { z } from 'zod'
import type { servemeTfServerSchema } from '../schemas/serveme-tf-server.schema'

export type ServemeTfServer = z.infer<typeof servemeTfServerSchema>
