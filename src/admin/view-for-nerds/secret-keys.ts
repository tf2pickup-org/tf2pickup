import type { Configuration } from '../../database/models/configuration-entry.model'

export const secretKeys = new Set<keyof Configuration>(['serveme_tf.api_key'])
