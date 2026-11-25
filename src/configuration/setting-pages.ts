import { z } from 'zod'

// Where each setting can be edited outside View for nerds
export const settingPages = z.registry<{ page: string }>()
